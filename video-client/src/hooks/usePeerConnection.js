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
}) {
  const peerRef = useRef();

  async function createPeer({ initiator, stream }) {
    const peer = new SimplePeer({ initiator, trickle: true, stream });

    peer.on("stream", (remoteStream) => {
      onRemoteStream(remoteStream);
    });

    peer.on("close", () => {
      onEnded();
    });

    peerRef.current = peer;
    return peer;
  }

  function destroyPeer() {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }

  return { peerRef, createPeer, destroyPeer };
}
