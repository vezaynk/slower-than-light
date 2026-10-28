import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CloudflareSfu, SfuError } from "./sfu.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Realtime SFU client", () => {
  it("establishes, answers, publishes, and subscribes with the app secret", async () => {
    const seen: { url: string; method: string; authorization: string; body: unknown }[] = [];
    const fetchImpl = (input: string, init?: RequestInit) => {
      seen.push({
        url: input,
        method: init?.method ?? "GET",
        authorization: new Headers(init?.headers).get("authorization") ?? "",
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (input.endsWith("/sessions/new"))
        return Promise.resolve(jsonResponse({ sessionId: "sess_1" }));
      if (input.endsWith("/datachannels/establish")) {
        return Promise.resolve(
          jsonResponse({
            requiresImmediateRenegotiation: true,
            sessionDescription: { type: "offer", sdp: "v=0\r\noffer" },
            dataChannel: { id: 0 },
          }),
        );
      }
      if (input.endsWith("/renegotiate")) return Promise.resolve(jsonResponse({}));
      if (input.endsWith("/datachannels/new")) {
        const body = JSON.parse(String(init?.body)) as { dataChannels: { location: string }[] };
        return Promise.resolve(
          jsonResponse({
            dataChannels: [
              {
                id: body.dataChannels[0]?.location === "local" ? 4 : 5,
                location: body.dataChannels[0]?.location,
                dataChannelName: "stl-handoff",
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse({ errorCode: "nope" }, 404));
    };
    const sfu = new CloudflareSfu("app", "secret", fetchImpl);
    assert.equal(await sfu.createSession(), "sess_1");
    const established = await sfu.establish("sess_1");
    assert.equal(established.sessionDescription.sdp, "v=0\r\noffer");
    assert.equal(established.dataChannelId, 0);
    await sfu.renegotiate("sess_1", { type: "answer", sdp: "v=0\r\nanswer" });
    assert.equal(await sfu.publish("sess_1"), 4);
    assert.equal(await sfu.subscribe("sess_2", "sess_1"), 5);

    assert.equal(seen[0]?.authorization, "Bearer secret");
    assert.equal(
      seen[1]?.body &&
        (seen[1].body as { dataChannel: { dataChannelName: string } }).dataChannel.dataChannelName,
      "server-events",
    );
    assert.equal(seen[2]?.method, "PUT");
    const subscribe = seen[4]?.body as {
      dataChannels: { canReply?: boolean; waitForAck?: boolean; sessionId?: string }[];
    };
    assert.equal(subscribe.dataChannels[0]?.canReply, true);
    assert.equal(subscribe.dataChannels[0]?.waitForAck, true);
    assert.equal(subscribe.dataChannels[0]?.sessionId, "sess_1");
  });

  it("rejects an item error and a missing credential", async () => {
    const sfu = new CloudflareSfu("app", "secret", () =>
      Promise.resolve(
        jsonResponse({
          dataChannels: [
            { id: 1, location: "local", dataChannelName: "stl-handoff", errorCode: "nope" },
          ],
        }),
      ),
    );
    await sfu.createSession().catch(() => {});
    await assert.rejects(sfu.publish("sess_1"), SfuError);
    assert.throws(() => new CloudflareSfu("", "secret"), SfuError);
  });
});
