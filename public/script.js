document.addEventListener("DOMContentLoaded", () => {
  const socket = io('https://jwr-lyart.vercel.app'); 
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const messageInput = document.getElementById('messageInput');
  const chatBox = document.getElementById('chatBox');
  const sendMessageButton = document.getElementById('sendMessageButton');

  let localStream;
  let remoteStream = new MediaStream();
  let peerConnection;
  const room = prompt("Enter room name to join:", "room1");

  const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  async function startMedia() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;

      
      socket.emit('joinRoom', room);
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  }

  socket.on('peer-connected', ({ id }) => {
    console.log('Peer connected:', id);
    createPeerConnection(id);
    makeOffer(id);
  });

  socket.on('offer', async ({ offer, from }) => {
    console.log('Received offer from', from);
    createPeerConnection(from);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room, answer, to: from });
  });

  socket.on('answer', async ({ answer }) => {
    console.log('Received answer');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('ice-candidate', async (candidate) => {
    console.log('Received ICE candidate');
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });

  socket.on('chat-message', (message) => {
    const timestamp = new Date().toLocaleTimeString();
    chatBox.innerHTML += `<p>Peer [${timestamp}]: ${message}</p>`;
  });

  function createPeerConnection(id) {
    peerConnection = new RTCPeerConnection(config);

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      remoteStream.addTrack(event.track);
      remoteVideo.srcObject = remoteStream;
      console.log('Received remote track:', event.track.kind);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { room, candidate: event.candidate, to: id });
      }
    };
  }

  async function makeOffer(id) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room, offer, to: id });
  }

  function sendMessage() {
    const message = messageInput.value;
    socket.emit('chat-message', { room, message });
    const timestamp = new Date().toLocaleTimeString();
    chatBox.innerHTML += `<p>You [${timestamp}]: ${message}</p>`;
    messageInput.value = '';
  }

  sendMessageButton.addEventListener('click', sendMessage);

  startMedia();
});
