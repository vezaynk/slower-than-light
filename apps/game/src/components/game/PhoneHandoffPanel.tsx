/**
 * Per the user: Options › Phone, beside Game files. Send this browser's game files, saved game, and
 * achievements to another device, or receive that set here. The code is a short room code. The bytes
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
import {
  createReceiveLink,
  createSendLink,
  type ReceiveLink,
  type SendLink,
} from "@/game/handoff/link";
import { formatCode, handoffOrigin, normalizeCode } from "@/game/handoff/relay";
import {
  confirmSaved,
  receiveCollected,
  reportFailure,
  sendCollected,
} from "@/game/handoff/transfer";

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
    const scale = Math.max(4, Math.floor(180 / qr.size));
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
      setProblem("Type the code. This browser has no QR scanner.");
      return;
    }
    let detector: Detector;
    try {
      detector = new Ctor({ formats: ["qr_code"] });
    } catch {
      setProblem("Type the code. This browser has no QR scanner.");
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
        if (!stop) setProblem("The camera is not available. Type the code instead.");
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
  const origin = handoffOrigin();
  const canLink = typeof RTCPeerConnection === "function";
  const ready = Boolean(origin) && canLink;
  const [inventory, setInventory] = useState<HandoffInventory | null>(null);
  const [phase, setPhase] = useState<Phase>("home");
  const [role, setRole] = useState<Role | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [paste, setPaste] = useState("");
  const [scan, setScan] = useState(false);
  const [copied, setCopied] = useState(false);
  const gen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const linkRef = useRef<SendLink | ReceiveLink | null>(null);
  const roleRef = useRef<Role | null>(null);
  const phaseRef = useRef<Phase>("home");
  const busyRef = useRef(false);
  roleRef.current = role;
  phaseRef.current = phase;

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
    busyRef.current = false;
    roleRef.current = next;
    setRole(next);
    setError(null);
    setCode(null);
    setProgress(0);
    setPaste("");
    setScan(false);
    setCopied(false);
    setStatus("");
    return gen.current;
  }

  function stop() {
    gen.current += 1;
    abortRef.current?.abort();
    linkRef.current?.close();
    linkRef.current = null;
    busyRef.current = false;
    roleRef.current = null;
    setRole(null);
    setPhase("home");
    setCode(null);
    setScan(false);
    setStatus("");
    setPaste("");
    setError(null);
  }

  function fail(mine: number, err: unknown) {
    if (gen.current !== mine) return;
    abortRef.current?.abort();
    linkRef.current?.close();
    linkRef.current = null;
    busyRef.current = false;
    roleRef.current = null;
    setRole(null);
    setPhase("home");
    setCode(null);
    setScan(false);
    setStatus("");
    setError(kept(err));
  }

  async function startSend() {
    const mine = begin("send");
    setPhase("preparing");
    setStatus("Opening a connection…");
    const signal = abortRef.current?.signal;
    if (!signal) return;
    try {
      const link = createSendLink(signal);
      void link.code.catch(() => {});
      void link.channel.catch(() => {});
      linkRef.current = link;
      const roomCode = await link.code;
      if (gen.current !== mine) return;
      setCode(roomCode);
      setPhase("exchange");
      setStatus("On the other device, choose Get it from my computer and enter this code.");
      const collectedPromise = collectHandoff();
      void collectedPromise.catch(() => {});
      const [collected, dc] = await Promise.all([collectedPromise, link.channel]);
      if (gen.current !== mine) return;
      setPhase("transfer");
      setStatus("Sending the game files, the saved game, and the achievements…");
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

  function startReceive() {
    begin("receive");
    setPhase("need-code");
    setStatus("Enter the code from the sending device.");
  }

  async function acceptCode(raw: string) {
    if (busyRef.current || roleRef.current !== "receive") return;
    const roomCode = normalizeCode(raw);
    if (!roomCode) {
      setError(kept(new Error("Enter the six-character code.")));
      return;
    }
    const mine = gen.current;
    const signal = abortRef.current?.signal;
    if (!signal) return;
    busyRef.current = true;
    setError(null);
    setScan(false);
    setPhase("preparing");
    setStatus("Connecting…");
    let dc: RTCDataChannel | null = null;
    try {
      const link = createReceiveLink(roomCode, signal);
      void link.channel.catch(() => {});
      linkRef.current = link;
      dc = await link.channel;
      if (gen.current !== mine) return;
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
        abortRef.current?.abort();
        linkRef.current?.close();
        linkRef.current = null;
        abortRef.current = new AbortController();
        busyRef.current = false;
        setPhase("need-code");
        setError(kept(err));
        setStatus("Enter the code from the sending device.");
        return;
      }
      fail(mine, err);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (phase !== "need-code") return;
    void acceptCode(paste);
  }

  function onScan(text: string) {
    if (phaseRef.current !== "need-code" || roleRef.current !== "receive") return;
    setPaste(text);
    void acceptCode(text);
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(formatCode(code));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const missing = inventory?.files.find((file) => file.missing);
  const pct = Math.round(progress * 100);

  return (
    <div className="ph">
      {phase === "home" ? (
        <>
          <p className="gf-note">
            {
              "This copies the game files, the saved game, and the achievements onto the other device. Enter the code on the other device. A transfer that stops leaves the files already stored here in place. A finished transfer replaces what is on the receiving device."
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
          {!origin ? (
            <p className="gf-note">{"Phone handoff is not set up on this copy of the game."}</p>
          ) : null}
          {origin && !canLink ? (
            <p className="gf-note">{"This browser cannot open a connection."}</p>
          ) : null}
          <div className="ph-actions">
            <button
              type="button"
              className="gf-button is-primary"
              disabled={!ready || !inventory || !!missing}
              onClick={() => void startSend()}
            >
              {"Send to my phone"}
            </button>
            <button type="button" className="gf-button" disabled={!ready} onClick={startReceive}>
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

      {phase === "exchange" && role === "send" && code ? (
        <div className="ph-code">
          <p className="ph-short">{formatCode(code)}</p>
          <QrCode text={code} />
          <button type="button" className="gf-button" onClick={() => void copyCode()}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </div>
      ) : null}

      {phase === "need-code" ? (
        <form className="ph-form" onSubmit={onSubmit}>
          <label className="ph-form">
            <span className="gf-note">{"Code from the computer"}</span>
            <input
              className="ph-code-input"
              value={paste}
              maxLength={11}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              aria-label={"Code from the computer"}
              onChange={(event) => setPaste(event.target.value)}
            />
          </label>
          {scan ? <QrScan onText={onScan} /> : null}
          <div className="ph-actions">
            <button type="submit" className="gf-button is-primary" disabled={!paste.trim()}>
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
