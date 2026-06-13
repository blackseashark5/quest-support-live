import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ChatMessage = {
  id: string;
  from: string;
  body: string;
  ts: number;
  self?: boolean;
};

export type CallStatus = "idle" | "connecting" | "connected" | "disconnected" | "failed";

type Role = "agent" | "customer";

const ICE: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};

export function useCallRoom(opts: { sessionId: string; role: Role; displayName: string }) {
  const { sessionId, role, displayName } = opts;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [peerName, setPeerName] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const startedRef = useRef(false);

  const sendSignal = useCallback((type: string, payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event: type, payload: { from: role, name: displayName, ...(payload as object) } });
  }, [role, displayName]);

  const setupPeer = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      const rs = new MediaStream();
      e.streams[0].getTracks().forEach((t) => rs.addTrack(t));
      setRemoteStream(rs);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal("ice", { candidate: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      else if (s === "connecting" || s === "new") setStatus("connecting");
      else if (s === "disconnected") setStatus("disconnected");
      else if (s === "failed" || s === "closed") setStatus("failed");
    };
    return pc;
  }, [sendSignal]);

  const makeOffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal("offer", { sdp: offer });
  }, [sendSignal]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setStatus("connecting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        cameraTrackRef.current = stream.getVideoTracks()[0];
        setLocalStream(stream);
        const pc = setupPeer(stream);

        const channel = supabase.channel(`room:${sessionId}`, { config: { broadcast: { self: false } } });
        channelRef.current = channel;

        channel
          .on("broadcast", { event: "presence" }, ({ payload }) => {
            const p = payload as { from: Role; name: string };
            if (p.from !== role) {
              setPeerName(p.name);
              // Agent initiates the offer when customer joins
              if (role === "agent" && pc.signalingState === "stable" && !startedRef.current) {
                startedRef.current = true;
                makeOffer();
              }
            }
          })
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            const p = payload as { from: Role; name: string; sdp: RTCSessionDescriptionInit };
            if (p.from === role) return;
            setPeerName(p.name);
            await pc.setRemoteDescription(p.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal("answer", { sdp: answer });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            const p = payload as { from: Role; sdp: RTCSessionDescriptionInit };
            if (p.from === role) return;
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(p.sdp);
            }
          })
          .on("broadcast", { event: "ice" }, async ({ payload }) => {
            const p = payload as { from: Role; candidate: RTCIceCandidateInit };
            if (p.from === role) return;
            try { await pc.addIceCandidate(p.candidate); } catch {}
          })
          .on("broadcast", { event: "chat" }, ({ payload }) => {
            const p = payload as { from: Role; name: string; body: string; ts: number; id: string };
            if (p.from === role) return;
            setMessages((m) => [...m, { id: p.id, from: p.name, body: p.body, ts: p.ts }]);
          })
          .on("broadcast", { event: "bye" }, () => {
            setStatus("disconnected");
          })
          .subscribe((s) => {
            if (s === "SUBSCRIBED") {
              sendSignal("presence", {});
            }
          });
      } catch (e) {
        console.error(e);
        setStatus("failed");
      }
    }
    start();
    return () => {
      cancelled = true;
      try { channelRef.current?.send({ type: "broadcast", event: "bye", payload: { from: role } }); } catch {}
      channelRef.current && supabase.removeChannel(channelRef.current);
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, role, displayName]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const enabled = !muted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !enabled));
    setMuted(enabled);
  }, [localStream, muted]);

  const toggleCam = useCallback(() => {
    if (!localStream) return;
    const off = !camOff;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !off));
    setCamOff(off);
  }, [localStream, camOff]);

  const toggleShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;
    if (!sharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = screen.getVideoTracks()[0];
        await sender.replaceTrack(track);
        setSharing(true);
        track.onended = async () => {
          if (cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
          setSharing(false);
        };
      } catch (e) {
        console.error(e);
      }
    } else {
      if (cameraTrackRef.current) await sender.replaceTrack(cameraTrackRef.current);
      setSharing(false);
    }
  }, [sharing]);

  const sendChat = useCallback((body: string) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), from: displayName, body, ts: Date.now(), self: true };
    setMessages((m) => [...m, msg]);
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: { from: role, name: displayName, body, ts: msg.ts, id: msg.id } });
  }, [displayName, role]);

  const hangup = useCallback(() => {
    try { channelRef.current?.send({ type: "broadcast", event: "bye", payload: { from: role } }); } catch {}
    pcRef.current?.close();
    localStream?.getTracks().forEach((t) => t.stop());
    setStatus("disconnected");
  }, [localStream, role]);

  return {
    localStream, remoteStream, status, peerName,
    muted, camOff, sharing, messages,
    toggleMute, toggleCam, toggleShare, sendChat, hangup,
  };
}