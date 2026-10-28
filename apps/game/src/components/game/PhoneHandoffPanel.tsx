/**
 * Per the user: Options › Phone, beside Game files. Send this browser's game files, saved game, and
 * achievements to another device, or receive that set here. The code is the WebRTC session. The bytes
 * move on a data channel. A transfer that stops leaves the files already stored here in place.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { encode } from "uqr";
import { formatBytes } from "@/game/pack/archive-inspect";
import {
  applyReceived,
  collectHandoff,
  handoffInventory,
  type HandoffInventory,
} from "@/game/handoff/bridge";
import { absorbTicket } from "@/game/handoff/frame";
import {
  createAnswerLink,
  createOfferLink,
  type HandoffSocket,
  type OfferSocket,
} from "@/game/handoff/link";
import {
  confirmSaved,
  receiveCollected,
  reportFailure,
  sendCollected,
} from "@/game/handoff/transfer";
import type { HandoffBytes, HandoffManifest } from "@/game/handoff/payload";

type Phase = "home" | "preparing" | "need-code" | "exchange" | "transfer" | "saving" | "done";
type Role = "send" | "receive";

type Detector = {
  detect(source: CanvasImageSource): Promise<{ rawValue?: string }[]>;
};

function kept(err: unknown): string {
  const message = err instanceof Error && err.message ? err.message : "The handoff stopped.";
  return `${message} The files already stored on this device were left in place.`;
}

function QrCode({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let qr: ReturnType<typeof encode>;
    try {
      qr = encode(text, { ecc: "L", border: 2 });
    } catch {
      return;
    }
    const scale = Math.max(2, Math.floor(260 / qr.size));
    canvas.width = qr.size * scale;
    canvas.height = qr.size * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#14110e";
    for (let y = 0; y < qr.size; y++) {
      const row = qr.data[y];
      if (!row) continue;
      for (let x = 0; x < qr.size; x++) {
        if (row[x]) ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [text]);
  return <canvas ref={ref} className="ph-qr" role="img" aria-label={"Connection code"} />;
}

function QrScan({ onText }: { onText: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    const Ctor = (
      globalThis as {
        BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setProblem("Paste the code. This browser has no QR scanner.");
      return;
    }
    let detector: Detector;
    try {
      detector = new Ctor({ formats: ["qr_code"] });
    } catch {
      setProblem("Paste the code. This browser has no QR scanner.");
      return;
    }
    let stop = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((next) => {
        stream = next;
        const video = videoRef.current;
        if (!video || stop) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = next;
        return video.play();
      })
      .then(() => {
        const tick = () => {
          if (stop) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            void detector
              .detect(video)
              .then((found) => {
                if (stop) return;
                for (const code of found) {
                  if (code.rawValue) onTextRef.current(code.rawValue);
                }
              })
              .catch(() => {});
          }
          timer = window.setTimeout(tick, 200);
        };
        timer = window.setTimeout(tick, 200);
      })
      .catch(() => {
        if (!stop) setProblem("The camera is not available. Paste the code instead.");
      });
    return () => {
      stop = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  return (
    <div className="ph-scan">
      {problem ? (
        <p className="gf-note">{problem}</p>
      ) : (
        <video ref={videoRef} className="ph-cam" muted playsInline autoPlay />
      )}
    </div>
  );
}

function Inventory({ inventory }: { inventory: HandoffInventory }) {
  return (
    <>
      <ul className="ph-files">
        {inventory.files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className={file.missing ? "is-missing" : file.enabled ? "" : "is-off"}
          >
            <b>{file.name}</b>
            <span>
              {file.missing ? "Missing" : file.builtin ? "Built in" : formatBytes(file.size)}
              {file.enabled ? "" : " · off"}
            </span>
          </li>
        ))}
      </ul>
      <p className="ph-meta">
        <span>{inventory.save ? "Saved game on this device" : "No saved game"}</span>
        <span>
          {inventory.achievements} {inventory.achievements === 1 ? "achievement" : "achievements"}
        </span>
        <span>
          {inventory.ships} {inventory.ships === 1 ? "ship unlocked" : "ships unlocked"}
        </span>
        <span>
          {inventory.scrap} scrap, {inventory.kills} {inventory.kills === 1 ? "kill" : "kills"}
        </span>
      </p>
    </>
  );
}

export function PhoneHandoffPanel() {
  const canLink = typeof RTCPeerConnection === "function";
  const [inventory, setInventory] = useState<HandoffInventory | null>(null);
  const [phase, setPhase] = useState<Phase>("home");
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<string[] | null>(null);
  const [ticketAt, setTicketAt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paste, setPaste] = useState("");
  const [scan, setScan] = useState(false);
  const [scanHave, setScanHave] = useState(0);
  const [scanNeed, setScanNeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const gen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const linkRef = useRef<OfferSocket | HandoffSocket | null>(null);
  const pendingRef = useRef<{ manifest: HandoffManifest; bytes: HandoffBytes } | null>(null);
  const bagRef = useRef(new Map<number, string>());
  const roleRef = useRef<Role | null>(null);
  roleRef.current = role;

  useEffect(() => {
    let live = true;
    handoffInventory().then(
      (next) => {
        if (live) setInventory(next);
      },
      (err: unknown) => {
        if (live)
          setError(err instanceof Error ? err.message : "The game files could not be read.");
      },
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      gen.current += 1;
      abortRef.current?.abort();
      linkRef.current?.close();
    };
  }, []);

  function begin(next: Role): number {
    gen.current += 1;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    linkRef.current?.close();
    linkRef.current = null;
    pendingRef.current = null;
    bagRef.current = new Map();
    roleRef.current = next;
    setRole(next);
    setError(null);
    setTickets(null);
    setTicketAt(0);
    setProgress(0);
    setPaste("");
    setScan(false);
    setScanHave(0);
    setScanNeed(0);
    setCopied(false);
    setStatus("");
    return gen.current;
  }

  function stop() {
    gen.current += 1;
    abortRef.current?.abort();
    linkRef.current?.close();
    linkRef.current = null;
    pendingRef.current = null;
    roleRef.current = null;
    setRole(null);
    setPhase("home");
    setTickets(null);
    setScan(false);
    setStatus("");
    setPaste("");
    setError(null);
  }

  function fail(mine: number, err: unknown) {
    if (gen.current !== mine) return;
    linkRef.current?.close();
    linkRef.current = null;
    pendingRef.current = null;
    roleRef.current = null;
    setRole(null);
    setPhase("home");
    setTickets(null);
    setScan(false);
    setStatus("");
    setError(kept(err));
  }

  async function startSend() {
    const mine = begin("send");
    setPhase("preparing");
    setStatus("Reading the game files…");
    try {
      const collected = await collectHandoff();
      if (gen.current !== mine) return;
      pendingRef.current = collected;
      const link = createOfferLink();
      void link.channel.catch(() => {});
      linkRef.current = link;
      setStatus("Looking for a path to the other device…");
      const codes = await link.tickets;
      if (gen.current !== mine) return;
      setTickets(codes);
      setPhase("exchange");
      setStatus(
        "On the other device, choose Get it from my computer. Scan this code or paste it there.",
      );
    } catch (err) {
      fail(mine, err);
    }
  }

  function startReceive() {
    begin("receive");
    setPhase("need-code");
    setStatus("Scan or paste the code from the sending device.");
  }

  async function useAnswer(text: string) {
    const mine = gen.current;
    const link = linkRef.current;
    const collected = pendingRef.current;
    const signal = abortRef.current?.signal;
    if (!link || !("takeAnswer" in link) || !collected || !signal) return;
    setError(null);
    setScan(false);
    setPhase("preparing");
    setStatus("Connecting…");
    try {
      await link.takeAnswer(text);
    } catch (err) {
      if (gen.current !== mine) return;
      setPhase("exchange");
      setError(kept(err));
      setStatus(
        "On the other device, choose Get it from my computer. Scan this code or paste it there.",
      );
      return;
    }
    try {
      if (gen.current !== mine) return;
      setPhase("transfer");
      setTickets(null);
      setStatus("Sending the game files, the saved game, and the achievements…");
      const dc = await link.channel;
      if (gen.current !== mine) return;
      await sendCollected(
        dc,
        collected.manifest,
        collected.bytes,
        (sent, total) => {
          if (gen.current !== mine) return;
          setProgress(total ? sent / total : 1);
        },
        signal,
      );
      if (gen.current !== mine) return;
      setProgress(1);
      setPhase("done");
      setStatus("The other device has the game files, the saved game, and the achievements.");
    } catch (err) {
      fail(mine, err);
    }
  }

  async function acceptOffer(text: string) {
    const mine = gen.current;
    const signal = abortRef.current?.signal;
    if (!signal || roleRef.current !== "receive") return;
    setError(null);
    setScan(false);
    setPhase("preparing");
    setStatus("Looking for a path to the other device…");
    let dc: RTCDataChannel | null = null;
    try {
      const link = createAnswerLink(text);
      void link.channel.catch(() => {});
      linkRef.current = link;
      const codes = await link.tickets;
      if (gen.current !== mine) return;
      setTickets(codes);
      setPhase("exchange");
      setStatus("Show this code to the sending device. The copy starts once it connects.");
      dc = await link.channel;
      if (gen.current !== mine) return;
      setTickets(null);
      setPhase("transfer");
      setStatus("Receiving the game files, the saved game, and the achievements…");
      const got = await receiveCollected(
        dc,
        (gotBytes, total) => {
          if (gen.current !== mine) return;
          setProgress(total ? gotBytes / total : 1);
        },
        signal,
      );
      if (gen.current !== mine) return;
      setPhase("saving");
      setProgress(1);
      setStatus("Saving on this device…");
      await applyReceived(got.manifest, got.bytes);
      try {
        await confirmSaved(dc);
      } catch {
        // The files are already stored. Reloading picks them up.
      }
      setPhase("done");
      setStatus("Saved on this device. Reloading…");
      window.setTimeout(() => location.reload(), 500);
    } catch (err) {
      if (dc) reportFailure(dc, err instanceof Error ? err.message : "The handoff stopped.");
      if (gen.current !== mine) return;
      if (!dc) {
        linkRef.current?.close();
        linkRef.current = null;
        setPhase("need-code");
        setTickets(null);
        setError(kept(err));
        setStatus("Scan or paste the code from the sending device.");
        return;
      }
      fail(mine, err);
    }
  }

  function submitText(text: string) {
    if (roleRef.current === "send") void useAnswer(text);
    else void acceptOffer(text);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = paste.trim();
    if (!text || phase === "preparing" || phase === "transfer" || phase === "saving") return;
    submitText(text);
  }

  function onScan(text: string) {
    const absorbed = absorbTicket(bagRef.current, text);
    setScanHave(absorbed.have);
    setScanNeed(absorbed.need);
    if (!absorbed.done) return;
    bagRef.current = new Map();
    setScan(false);
    setPaste(absorbed.done);
    submitText(absorbed.done);
  }

  async function copyCode() {
    if (!tickets) return;
    try {
      await navigator.clipboard.writeText(tickets.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const missing = inventory?.files.find((file) => file.missing);
  const showPaste = phase === "need-code" || (phase === "exchange" && role === "send");
  const pct = Math.round(progress * 100);

  return (
    <div className="ph">
      {phase === "home" ? (
        <>
          <p className="gf-note">
            {
              "This copies the game files, the saved game, and the achievements onto the other device. Both devices on the same Wi-Fi can connect with the code. A transfer that stops leaves the files already stored here in place. A finished transfer replaces what is on the receiving device."
            }
          </p>
          {inventory ? (
            <Inventory inventory={inventory} />
          ) : (
            <p className="gf-note">{"Reading this device…"}</p>
          )}
          {error ? <p className="gf-alert">{error}</p> : null}
          {missing ? (
            <p className="gf-alert">
              {`${missing.name} is no longer stored in this browser. Remove it under Game files, then pick it again.`}
            </p>
          ) : null}
          {!canLink ? (
            <p className="gf-note">{"This browser cannot open a direct connection."}</p>
          ) : null}
          <div className="ph-actions">
            <button
              type="button"
              className="gf-button is-primary"
              disabled={!canLink || !inventory || !!missing}
              onClick={() => void startSend()}
            >
              {"Send to my phone"}
            </button>
            <button type="button" className="gf-button" disabled={!canLink} onClick={startReceive}>
              {"Get it from my computer"}
            </button>
          </div>
        </>
      ) : null}

      {status ? (
        <p className="ph-status" role="status">
          {status}
        </p>
      ) : null}
      {phase !== "home" && error ? <p className="gf-alert">{error}</p> : null}

      {tickets && tickets[ticketAt] ? (
        <div className="ph-code">
          <QrCode text={tickets[ticketAt]} />
          {tickets.length > 1 ? (
            <div className="ph-pages">
              <button
                type="button"
                className="gf-button"
                onClick={() => setTicketAt((at) => (at + tickets.length - 1) % tickets.length)}
              >
                {"Previous code"}
              </button>
              <span className="gf-note">{`Code ${ticketAt + 1} of ${tickets.length}`}</span>
              <button
                type="button"
                className="gf-button"
                onClick={() => setTicketAt((at) => (at + 1) % tickets.length)}
              >
                {"Next code"}
              </button>
            </div>
          ) : null}
          <textarea
            className="ph-paste"
            readOnly
            value={tickets.join("\n")}
            aria-label={"Connection code"}
          />
          <button type="button" className="gf-button" onClick={() => void copyCode()}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      ) : null}

      {showPaste ? (
        <form className="ph-form" onSubmit={onSubmit}>
          <label className="ph-form">
            <span className="gf-note">
              {role === "send" ? "Code from the phone" : "Code from the computer"}
            </span>
            <textarea
              className="ph-paste"
              value={paste}
              aria-label={role === "send" ? "Code from the phone" : "Code from the computer"}
              onChange={(event) => setPaste(event.target.value)}
            />
          </label>
          {scan ? <QrScan onText={onScan} /> : null}
          {scan && scanNeed > 1 ? (
            <p className="gf-note">{`Scanned ${scanHave} of ${scanNeed}.`}</p>
          ) : null}
          <div className="ph-actions">
            <button
              type="submit"
              className="gf-button is-primary"
              disabled={phase === "preparing" || !paste.trim()}
            >
              {"Connect"}
            </button>
            <button type="button" className="gf-button" onClick={() => setScan((on) => !on)}>
              {scan ? "Hide camera" : "Scan a code"}
            </button>
          </div>
        </form>
      ) : null}

      {phase === "transfer" || phase === "saving" ? (
        <div
          className="ph-meter"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={"Handoff progress"}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      ) : null}

      {phase !== "home" && phase !== "saving" && phase !== "done" ? (
        <button type="button" className="gf-button" onClick={stop}>
          {"Cancel"}
        </button>
      ) : null}
      {phase === "done" && role === "send" ? (
        <button type="button" className="gf-button" onClick={stop}>
          {"Done"}
        </button>
      ) : null}
    </div>
  );
}
