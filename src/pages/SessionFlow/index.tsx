import { useEffect, useRef, useState } from 'react';
import styles from './index.less';
import io from 'socket.io-client';
import { Input, Tag } from 'antd';
import {
  CheckCircleOutlined,
  SwapOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
const SessionFlow: React.FC = () => {
  const [roomUserList, setRoomUserList] = useState([]);
  const [userInfo, setUserInfo] = useState<any>({
    userId: '',
    roomId: '',
    nickname: '',
  });
  const [formInline, setFormInline] = useState<any>({
    rtcmessageRes: '',
    rtcmessage: '',
  });
  const linkSocket = useRef<any>();
  const localRtcPc = useRef<any>();
  const channel = useRef<any>();
  const mapSender = useRef<any>();

  function handleError(error: any) {
    // alert("摄像头无法正常使用，请检查是否占用或缺失")
    console.error(
      'navigator.MediaDevices.getUserMedia error: ',
      error.message,
      error.name,
    );
  }

  const PeerConnection: any =
    (window as any).RTCPeerConnection ||
    (window as any).mozRTCPeerConnection ||
    (window as any).webkitRTCPeerConnection;

  const getParams = (queryName: string) => {
    let url = window.location.href;
    let query = decodeURI(url.split('?')[1]);
    let vars = query.split('&');
    for (let i = 0; i < vars.length; i++) {
      let pair = vars[i].split('=');
      if (pair[0] === queryName) {
        return pair[1];
      }
    }
    return null;
  };

  // 设置直播流
  const setDomVideoStream = async (domId: string, newStream: any) => {
    let video: any = document.getElementById(domId);
    let stream = video.srcObject;
    if (stream) {
      stream.getAudioTracks().forEach((e: any) => {
        stream.removeTrack(e);
      });
      stream.getVideoTracks().forEach((e: any) => {
        stream.removeTrack(e);
      });
    }
    video.srcObject = newStream;
    video.muted = true;
  };

  const setRemoteDomVideoStream = (domId: string, track: any) => {
    let video: any = document.getElementById(domId);
    let stream = video.srcObject;
    if (stream) {
      stream.addTrack(track);
    } else {
      let newStream = new MediaStream();
      newStream.addTrack(track);
      video.srcObject = newStream;
      video.muted = true;
    }
  };

  /**
   * 获取设备 stream
   * @param constraints
   * @returns {Promise<MediaStream>}
   */
  const getLocalUserMedia = async (
    constraints: MediaStreamConstraints | undefined,
  ) => {
    return await navigator.mediaDevices
      .getUserMedia(constraints)
      .catch(handleError);
  };
  const onPcEvent = (pc: any, localUid: any, remoteUid: any) => {
    console.log('11111111111111111111');
    channel.current = pc.createDataChannel('chat');
    pc.ontrack = function (event: any) {
      console.log(event);
      setRemoteDomVideoStream('remoteVideo01', event.track);
    };
    pc.onnegotiationneeded = function (e: any) {
      console.log('重新协商', e);
    };
    pc.ondatachannel = function (ev: any) {
      console.log('Data channel is created!');
      ev.channel.onopen = function () {
        console.log('Data channel ------------open----------------');
      };
      ev.channel.onmessage = function (data: any) {
        console.log('接收消息 ------------msg----------------', data);
        setFormInline({
          ...formInline,
          rtcmessageRes: data.data,
        });
      };
      ev.channel.onclose = function () {
        console.log('Data channel ------------close----------------');
      };
    };
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        linkSocket.current.emit('candidate', {
          targetUid: remoteUid,
          userId: localUid,
          candidate: event.candidate,
        });
      } else {
        /* 在此次协商中，没有更多的候选了 */
        console.log('在此次协商中，没有更多的候选了');
      }
    };
  };
  const initCallerInfo = async (callerId: string, calleeId: string) => {
    mapSender.current = [];
    //初始化pc
    localRtcPc.current = new PeerConnection();
    //获取本地媒体并添加到pc中
    let localStream: any = await getLocalUserMedia({
      audio: true,
      video: true,
    });
    for (const track of localStream.getTracks()) {
      mapSender.current.push(localRtcPc.current.addTrack(track));
    }
    // 本地dom渲染
    await setDomVideoStream('localdemo01', localStream);
    //回调监听
    onPcEvent(localRtcPc.current, callerId, calleeId);
    //创建offer
    let offer = await localRtcPc.current.createOffer({ iceRestart: true });
    //设置offer未本地描述
    await localRtcPc.current.setLocalDescription(offer);
    //发送offer给被呼叫端
    let params = { targetUid: calleeId, userId: callerId, offer: offer };
    linkSocket.current.emit('offer', params);
  };
  const call = async (item: any) => {
    initCallerInfo(getParams('userId'), item.userId);
    let params = {
      userId: getParams('userId'),
      targetUid: item.userId,
    };
    linkSocket.current.emit('call', params);
  };
  const initCalleeInfo = async (localUid: string, fromUid: string) => {
    //初始化pc
    localRtcPc.current = new PeerConnection();
    //初始化本地媒体信息
    let localStream: any = await getLocalUserMedia({
      audio: true,
      video: true,
    });
    for (const track of localStream.getTracks()) {
      localRtcPc.current.addTrack(track);
    }
    // dom渲染
    await setDomVideoStream('localdemo01', localStream);
    //监听
    onPcEvent(localRtcPc.current, localUid, fromUid);
  };

  // 呼叫
  const onCall = async (e: any) => {
    console.log('远程呼叫：', e);
    await initCalleeInfo(e.data['targetUid'], e.data['userId']);
  };

  const sendMessageUserRtcChannel = () => {
    if (!channel.current) {
      alert('请先建立webrtc连接');
    }
    console.log(formInline.rtcmessage);
    channel.current.send(formInline.rtcmessage);
    setFormInline({
      ...formInline,
      rtcmessage: undefined,
    });
  };
  const onRemoteOffer = async (fromUid: any, offer: any) => {
    localRtcPc.current.setRemoteDescription(offer);
    let answer = await localRtcPc.current.createAnswer();
    await localRtcPc.current.setLocalDescription(answer);
    let params = {
      targetUid: fromUid,
      userId: getParams('userId'),
      answer: answer,
    };
    linkSocket.current.emit('answer', params);
  };
  const onRemoteAnswer = async (fromUid: string, answer: string) => {
    await localRtcPc.current.setRemoteDescription(answer);
  };

  const changeBitRate = () => {
    console.log(localRtcPc.current);
    const senders = localRtcPc.current.getSenders();
    const send = senders.find((s: any) => s.track.kind === 'video');
    const parameters = send.getParameters();
    parameters.encodings[0].maxBitrate = 1 * 1000 * 1024;
    send.setParameters(parameters);
  };

  // 打开或关闭摄像头
  const openVideoOrNot = () => {
    const senders = localRtcPc.current.getSenders();
    const send = senders.find((s: any) => s.track.kind === 'video');
    send.track.enabled = !send.track.enabled; //控制视频显示与否
  };
  // /**
  //  * 获取屏幕分享的媒体流
  //  * @author suke
  //  * @returns {Promise<void>}
  //  */
  // async getShareMedia(){
  //     const constraints = {
  //         video:{width:1920,height:1080},
  //     audio:true
  //     };
  //     if (window.stream) {
  //         window.stream.getTracks().forEach(track => {
  //             track.stop();
  //         });
  //     }
  //     return await navigator.mediaDevices.getDisplayMedia(constraints).catch(handleError);
  // }
  const streamInfo = (domId: string) => {
    let video: any = document.getElementById(domId);
    console.log(video.srcObject);
  };
  const getStats = () => {
    const senders = localRtcPc.current.getSenders();
    const send = senders.find((s: any) => s.track.kind === 'video');
    console.log(send.getParameters().encodings);
    let lastResultForStats: any; //上次计算结果
    setInterval(() => {
      localRtcPc.current.getStats().then((res: any) => {
        res.forEach((report: any) => {
          let bytes;
          let headerBytes;
          let packets;
          // console.log(report)
          //出口宽带 outbound-rtp  入口宽带 inbound-rtp
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            const now = report.timestamp;
            bytes = report.bytesSent;
            headerBytes = report.headerBytesSent;
            packets = report.packetsSent;
            console.log(bytes, headerBytes, packets);
            if (lastResultForStats && lastResultForStats.has(report.id)) {
              let bf = bytes - lastResultForStats.get(report.id).bytesSent;
              let hbf =
                headerBytes - lastResultForStats.get(report.id).headerBytesSent;
              let pacf =
                packets - lastResultForStats.get(report.id).packetsSent;
              let t = now - lastResultForStats.get(report.id).timestamp;
              // calculate bitrate
              const bitrate = Math.floor((8 * bf) / t);
              const headerrate = Math.floor((8 * hbf) / t);
              const packetrate = Math.floor((1000 * pacf) / t);
              console.log(
                `Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`,
              );
            }
          }
        });
        lastResultForStats = res;
      });
    }, 4000);
  };
  // 初始化
  const init = (userId: string, roomId: string, nickname: string) => {
    setUserInfo({
      userId: userId,
      roomId: roomId,
      nickname: nickname,
    });
    linkSocket.current = io('ws://127.0.0.1:18080', {
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
      query: {
        userId: userId,
        roomId: roomId,
        nickname: nickname,
      },
    });
    linkSocket.current.on('connect', () => {
      console.log('server init connect success', linkSocket.current);
    });
    linkSocket.current.on('roomUserList', (e: any) => {
      console.log('roomUserList', e);
      setRoomUserList(e);
    });
    linkSocket.current.on('msg', async (e: any) => {
      console.log('msg', e);
      if (e['type'] === 'join' || e['type'] === 'leave') {
        setTimeout(() => {
          let params = { roomId: getParams('roomId') };
          linkSocket.current.emit('roomUserList', params);
        }, 1000);
      }
      if (e['type'] === 'call') {
        await onCall(e);
      }
      if (e['type'] === 'offer') {
        await onRemoteOffer(e['data']['userId'], e['data']['offer']);
      }
      if (e['type'] === 'answer') {
        await onRemoteAnswer(e['data']['userId'], e['data']['answer']);
      }
      if (e['type'] === 'candidate') {
        localRtcPc.current.addIceCandidate(e.data.candidate);
      }
    });
    linkSocket.current.on('error', (e: any) => {
      console.log('error', e);
    });
  };
  useEffect(() => {
    if (getParams('userId')) {
      init(getParams('userId'), getParams('roomId'), getParams('userId'));
    }
  }, []);

  return (
    <div>
      {/* 房间用户列表 */}
      <div className={styles.roombox}>
        {roomUserList.map((item: any, i: number) => (
          <div key={i} className={styles.roomitem}>
            <Tag color="orange" onClick={getStats}>
              用户{item.nickname}
            </Tag>
            {userInfo.userId === item.userId && (
              <Tag
                icon={<CheckCircleOutlined />}
                color="purple"
                onClick={changeBitRate}
              >
                增加比特率
              </Tag>
            )}
            {userInfo.userId !== item.userId && (
              <Tag
                icon={<WhatsAppOutlined />}
                color="success"
                onClick={() => call(item)}
              >
                通话
              </Tag>
            )}
            {userInfo.userId === item.userId && (
              <Tag
                icon={<SwapOutlined />}
                color="#3b5999"
                onClick={openVideoOrNot}
              >
                切换语音/视频模式
              </Tag>
            )}
          </div>
        ))}
      </div>
      {/* 消息发送 */}
      <div>
        发送消息：
        <Input
          defaultValue={formInline.rtcmessage}
          onChange={(e) => {
            setFormInline({
              ...formInline,
              rtcmessage: e.target.value,
            });
          }}
        />
      </div>
      <div>
        远端消息：
        <Input value={formInline.rtcmessageRes} />
      </div>
      <div onClick={sendMessageUserRtcChannel}>立即发送</div>
      {/* 直播间 */}
      <div className={styles.videobox}>
        <video
          onClick={() => streamInfo('localdemo01')}
          id="localdemo01"
          autoPlay
          controls
          muted
        ></video>
        <video
          onClick={() => streamInfo('remoteVideo01')}
          id="remoteVideo01"
          autoPlay
          controls
          muted
        ></video>
      </div>
    </div>
  );
};

export default SessionFlow;
