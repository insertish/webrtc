const videoEl = document.querySelector('video');

// Get video stream.
navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(mediaStream => {
        // Start playing this media stream.
        videoEl.srcObject = mediaStream;
        test(mediaStream);
    })
    .catch(alert);

function test(mediaStream) {
    // Log video tracks.
    console.log(mediaStream.getVideoTracks());

    // Stop after 5 seconds.
    setTimeout(() => {
        mediaStream.getVideoTracks()[0].stop();
    }, 5000);
}
