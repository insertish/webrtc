const socket = io();

const videoEl = document.querySelector('#local');
const remotEl = document.querySelector('#remote');
const callBtn = document.querySelector('#call');
const quitBtn = document.querySelector('#quit');

callBtn.disabled = true;
quitBtn.disabled = true;

let id = (''+Math.random()).split('.')[1];
let connected = false;

let localStream;
let activePeers;
let peerElements = {};
let localPeerConnections = {};
let remotePeerConnections = {};

// Get video stream.
navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(mediaStream => {
        localStream = mediaStream;
        videoEl.srcObject = mediaStream;
        callBtn.disabled = false;
        quitBtn.disabled = true;
    })
    .catch(alert);

// Create new local peer connections.
async function createLocalPeer(peer) {
    const conn = new RTCPeerConnection();

    conn.addEventListener('icecandidate', ev => {
        let candidate = ev.candidate;
        if (candidate) {
            socket.emit('candidate', {
                peer, candidate
            });
        }
    });

    localStream
        .getTracks()
        .forEach(track => conn.addTrack(track));

    const offer = await conn.createOffer({ offerToReceiveVideo: 1 });
    await conn.setLocalDescription(offer);

    socket.emit('offer', {
        peer, offer
    });

    localPeerConnections[peer] = conn;
}

// Connect new peers.
socket.on('joined', async (peer) => {
    if (!connected) return;
    if (peer !== id) {
        activePeers.add(peer);
        await createLocalPeer(peer);
    }
});

// Disconnect old peers.
socket.on('quit', async (peer) => {
    if (!connected) return;
    if (peer === id) return;

    activePeers.delete(peer);
    peerElements[peer].remove();
    try {localPeerConnections[peer]?.close();}catch(err){}
    try {remotePeerConnections[peer]?.close();}catch(err){}
    delete localPeerConnections[peer];
    delete remotePeerConnections[peer];
});

// Accept new remote peer connections.
socket.on('offer', async ({ peer, offer, source }) => {
    if (!connected) return;
    if (source === id) return;
    if (peer === id) {
        const conn = new RTCPeerConnection();
    
        conn.addEventListener('icecandidate', ev => {
            let candidate = ev.candidate;
            if (candidate) {
                socket.emit('candidate', {
                    peer: source, candidate
                });
            }
        });

        conn.addEventListener('track', ev => {
            peerElements[source]?.remove();

            const el = document.createElement('video');
            el.id = source;
            el.autoplay = true;
            el.playsInline = true;
            el.style = "width: 40%";
            el.srcObject = new MediaStream([ ev.track ]);
            peerElements[source] = el;
            remotEl.appendChild(el);
        });

        await conn.setRemoteDescription(offer);
        
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);

        remotePeerConnections[source] = conn;
        socket.emit('answer', { peer: source, answer });
    }
});

// Accept ICE candidates.
socket.on('candidate', async ({ peer, candidate, source }) => {
    if (!connected) return;
    if (peer === id) {
        // ! FIXME
        localPeerConnections[source]?.addIceCandidate(candidate);
    }
});

// Complete new remote peer connections.
socket.on('answer', async ({ peer, answer, source }) => {
    if (!connected) return;
    if (peer === id) {
        localPeerConnections[source].setRemoteDescription(answer);
    }
});

// Button logic.
callBtn
    .addEventListener('click', async () => {
        callBtn.disabled = true;

        socket.once('send offer to', async ({ peers }) => {
            activePeers = new Set(peers);
            connected = true;

            for (const peer of activePeers) {
                await createLocalPeer(peer);
            }
        });

        socket.emit('join', { id });
        quitBtn.disabled = false;
    });

quitBtn
    .addEventListener('click', async () => {
        socket.emit('quit');

        connected = false;
        remotEl.innerHTML = "";
        quitBtn.disabled = false;

        for (const peer of activePeers) {
            localPeerConnections[peer]?.close();
            remotePeerConnections[peer]?.close();
        }

        activePeers = [];

        callBtn.disabled = false;
        quitBtn.disabled = true;
    });
