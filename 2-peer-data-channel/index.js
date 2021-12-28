const localEl = document.querySelector('#local');
const remotEl = document.querySelector('#remote');
const callBtn = document.querySelector('#connect');
const quitBtn = document.querySelector('#quit');

let sendChannel, localPeerConnection, remotePeerConnection;

localEl.value = '';
remotEl.value = '';

function setupRTC() {
    // Setup local RTC client.
    localPeerConnection = new RTCPeerConnection();

    sendChannel = localPeerConnection.createDataChannel('sendDataChannel');

    function changeListener() {
        sendChannel.send(localEl.value);
    }

    sendChannel.onopen = () => localEl.addEventListener('keyup', changeListener);
    sendChannel.onclose = () => localEl.removeEventListener('keyup', changeListener);

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

    remotePeerConnection.addEventListener('datachannel', ev => {
        ev.channel.addEventListener('message', message => {
            remotEl.value = message.data;
        });
    });
}

// Button logic.
callBtn
    .addEventListener('click', async () => {
        callBtn.disabled = true;

        // Setup peer connections.
        setupRTC();

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
        localPeerConnection.close();
        remotePeerConnection.close();
        callBtn.disabled = false;
        quitBtn.disabled = true;
    });
