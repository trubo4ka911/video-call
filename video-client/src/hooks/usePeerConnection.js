import { useRef } from "react";
import SimplePeer from "simple-peer";

/**
 * A very thin hook that gives you:
 * - peerRef.current
 * - createPeer({ initiator, stream })
 * - destroyPeer()
 *
 * It no longer auto-emits a `"signal"` event.  You will wire
 * `.on('signal', …)` yourself so you can emit to `call-user` /
 * `answer-call` / `ice-candidate` as your server expects.
 */
export function usePeerConnection({
  socket,
  remoteId,
  onRemoteStream,
  onEnded,
  onConnectionFailed,
}) {
  const peerRef = useRef();

  async function createPeer({ initiator, stream }) {
    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream,
      config: (() => {
        const ice = [{ urls: "stun:stun.l.google.com:19302" }];
        // allow an env-provided TURN server via REACT_APP_TURN_URL (optional)
        try {
          const turnUrl =
            typeof process !== "undefined" &&
            process.env &&
            process.env.REACT_APP_TURN_URL;
          const turnUser =
            typeof process !== "undefined" &&
            process.env &&
            process.env.REACT_APP_TURN_USER;
          const turnPass =
            typeof process !== "undefined" &&
            process.env &&
            process.env.REACT_APP_TURN_PASS;
          if (turnUrl) {
            ice.push({
              urls: turnUrl,
              username: turnUser,
              credential: turnPass,
            });
          }
        } catch (e) {}
        return { iceServers: ice };
      })(),
    });

    peer.on("error", (err) => {
      console.error("[peer] error", err);
    });

    peer.on("signal", (data) => {
      // keep logging minimal here
      const t =
        data?.type || (data && data.candidate ? "candidate" : typeof data);
      console.log("[peer] signal", t);
    });

    peer.on("stream", (remoteStream) => {
      console.log(
        "[peer] remote stream received, tracks=",
        remoteStream.getTracks().map((t) => t.kind + ":" + t.id)
      );
      onRemoteStream(remoteStream);
    });

    peer.on("close", () => {
      console.log("[peer] closed");
      onEnded();
    });

    peerRef.current = peer;

    // Attach underlying RTCPeerConnection observers if available
    setTimeout(() => {
      try {
        const pc = peer._pc || peer._context?.pc;
        if (!pc) return;
        console.log("[peer.pc] attaching state observers");
        pc.oniceconnectionstatechange = () => {
          console.log("[peer.pc] iceConnectionState=", pc.iceConnectionState);
        };
        pc.onicegatheringstatechange = () => {
          console.log("[peer.pc] iceGatheringState=", pc.iceGatheringState);
        };
        pc.onconnectionstatechange = () => {
          console.log("[peer.pc] connectionState=", pc.connectionState);
          if (pc.connectionState === "failed") {
            console.warn("[peer.pc] connectionState is failed");
            if (typeof onConnectionFailed === "function") {
              try {
                onConnectionFailed();
              } catch (e) {
                console.warn("[peer.pc] onConnectionFailed threw", e);
              }
            }
          }
        };
      } catch (e) {
        // ignore
      }
    }, 500);

    return peer;
  }

  function destroyPeer() {
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (e) {}
      peerRef.current = null;
    }
  }

  return { peerRef, createPeer, destroyPeer };
}
