const videoEl = document.querySelector('#local');
const remotEl = document.querySelector('#remote');
const callBtn = document.querySelector('#call');
const quitBtn = document.querySelector('#quit');

let localStream, localPeerConnection, remotePeerConnection;

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

function setupRTC() {
    // Setup local RTC client.
    localPeerConnection = new RTCPeerConnection();

    localPeerConnection.addEventListener('icecandidate', ev => {
        if (ev.candidate) {
            // Send this over signaling server.
            remotePeerConnection.addIceCandidate(ev.candidate);
        }
    });

    localPeerConnection.addEventListener('iceconnectionstatechange', state => console.log('Local state:', state));

    // Setup "remote" RTC client.
    remotePeerConnection = new RTCPeerConnection();

    remotePeerConnection.addEventListener('icecandidate', ev => {
        if (ev.candidate) {
            // Send this over signaling server.
            localPeerConnection.addIceCandidate(ev.candidate);
        }
    });

    remotePeerConnection.addEventListener('iceconnectionstatechange', state => console.log('Remote state:', state));

    remotePeerConnection.addEventListener('track', ev => {
        remotEl.srcObject = new MediaStream([ ev.track ]);
    });
}

// Button logic.
callBtn
    .addEventListener('click', async () => {
        callBtn.disabled = true;

        // Setup peer connections.
        setupRTC();

        // Push local track to peer connection.
        localStream
            .getTracks()
            .forEach(track => localPeerConnection.addTrack(track));

        // Generate a SDP offer. (contains information about how we could potentially transmit video)
        const offer = await localPeerConnection.createOffer({ offerToReceiveVideo: 1 });

        // Set descriptions on both local and remote peers.
        await localPeerConnection.setLocalDescription(offer);
        await remotePeerConnection.setRemoteDescription(offer);

        // Create a SDP reply to the offer. (contains information about how can transmit video)
        const answer = await remotePeerConnection.createAnswer();

        // Set descriptions on both local and remote peers.
        await remotePeerConnection.setLocalDescription(answer);
        await localPeerConnection.setRemoteDescription(answer);

        quitBtn.disabled = false;
    });

quitBtn
    .addEventListener('click', async () => {
        socket.emit('quit');
        localPeerConnection.close();
        remotePeerConnection.close();
        callBtn.disabled = false;
        quitBtn.disabled = true;
    });
