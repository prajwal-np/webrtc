const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo");
const remoteMediaStream = new MediaStream();
let localMediaStream;
const callId = document.getElementById("callId");
const myId = document.getElementById("myId");
const remoteIdDisplay = document.getElementById("remoteId");
const stopBtn = document.getElementById("stop");

let remoteId, peerConnection;

const socket = new WebSocket('wss://localhost:8080');

socket.onopen=(()=>{
    console.log("socket connected 🎉");
    start();
});

socket.onerror=(error)=>{
    console.log(error)
};

socket.onmessage =async({data})=>{
    const res = JSON.parse(data);
    switch (res.action) {
        case 'start':
            console.log("server client");
            const id = res.id;
            myId.innerHTML= id;
            break;
        case 'offer':
            remoteId = res.data.remoteId;
            delete res.data.remoteId;
            remoteIdDisplay.innerHTML = remoteId;
            await initializePeerConnection(localMediaStream.getTracks());
            await peerConnection.setRemoteDescription(new RTCSessionDescription(res.data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            sendSocketMessage("answer",{remoteId,answer});
            break;
        case 'answer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(res.data.answer));
            break;
        case 'new connection':
            callId.value = res.remoteId;
            remoteIdDisplay.innerHTML = res.remoteId;
            call();
            break;
        case 'iceCandidate':
            await peerConnection.addIceCandidate(res.data.candidate);
            break;
        default: console.warn('unknown action', res.action);
    }
}
const getMedia = async(constrains)=>{
    const mediaStream = await navigator.mediaDevices.getUserMedia(constrains);
    localVideo.srcObject = mediaStream;
    return mediaStream;
}

const stop =()=>{
    if(!localVideo.srcObject) return;
    for(const track of localVideo.srcObject.getTracks()){
        track.stop();
    };
    peerConnection.close();
}

const sendSocketMessage = (action, data)=>{
    if(action==='answer'){
        console.log('asda')
    }
    const req = {action,data};
    socket.send(JSON.stringify(req));
}

const call = async () => {
    try {
      remoteId = callId.value;
      remoteIdDisplay.innerHTML = remoteId;
      if (!remoteId) {
        alert('Please enter a remote id');
        
        return;
      }
      await initializePeerConnection(localMediaStream.getTracks());
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      sendSocketMessage('offer', { offer, remoteId });
    } catch (error) {
      console.error('failed to initialize call', error);
    }
  };
const start = async ()=>{
    localMediaStream = await getMedia({video:true, audi:true});
     sendSocketMessage("start")
}


const initializePeerConnection = async (mediaTracks) => {
    const config = { iceServers: [{ urls: [ 'stun:stun1.l.google.com:19302' ] } ] };
    peerConnection = new RTCPeerConnection(config);
  
    peerConnection.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      sendSocketMessage('iceCandidate', { remoteId, candidate });
    };
  
    peerConnection.oniceconnectionstatechange = () => {
      console.log('peerConnection::iceconnectionstatechange newState=', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'disconnected') {
        alert('Connection has been closed stopping...');
        socket.close();
      }
    };
  
    peerConnection.ontrack = ({ track }) => {
      remoteMediaStream.addTrack(track);
      remoteVideo.classList.remove('d-none');
      remoteVideo.srcObject = remoteMediaStream;
    };
  
    for (const track of mediaTracks) {
      peerConnection.addTrack(track);
    }
    stopBtn.disabled = false;
  };

  const oncopy= async ()=>{
    console.log(myId.innerHTML)
    // navigator.clipboard.writeText(myId.innerHTML);
}