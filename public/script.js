document.addEventListener("DOMContentLoaded", () => {
  const socket = io(); 
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const messageInput = document.getElementById('messageInput');
  const chatBox = document.getElementById('chatBox');
  const sendMessageButton = document.getElementById('sendMessageButton');

  let localStream;
  let remoteStream = new MediaStream();
  const peerConnections = {};
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
    const connection = peerConnections[from];
    await connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    socket.emit('answer', { room, answer, to: from });
  });

  socket.on('answer', async ({ answer, from }) => {
    console.log('Received answer from', from);
    const connection = peerConnections[from];
    await connection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('ice-candidate', async ({ candidate, from }) => {
    console.log('Received ICE candidate from', from);
    const connection = peerConnections[from];
    if (connection) {
      await connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  socket.on('peer-disconnected', (id) => {
    console.log('Peer disconnected:', id);
    if (peerConnections[id]) {
      peerConnections[id].close();
      delete peerConnections[id];
    }
  });

  socket.on('chat-message', ({ message, from }) => {
    const timestamp = new Date().toLocaleTimeString();
    chatBox.innerHTML += `<p>${from} [${timestamp}]: ${message}</p>`;
  });

  function createPeerConnection(id) {
    if (peerConnections[id]) return;

    const connection = new RTCPeerConnection(config);
    peerConnections[id] = connection;

    localStream.getTracks().forEach((track) => {
      connection.addTrack(track, localStream);
    });

    connection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      remoteVideo.srcObject = remoteStream;
      console.log('Received remote track:', event.track.kind);
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { room, candidate: event.candidate, to: id });
      }
    };
  }

  async function makeOffer(id) {
    const connection = peerConnections[id];
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    socket.emit('offer', { room, offer, to: id });
  }

  function sendMessage() {
    const message = messageInput.value;
    socket.emit('chat-message', { room, message, from: 'You' });
    const timestamp = new Date().toLocaleTimeString();
    chatBox.innerHTML += `<p>You [${timestamp}]: ${message}</p>`;
    messageInput.value = '';
  }

  sendMessageButton.addEventListener('click', sendMessage);

  startMedia();
});
