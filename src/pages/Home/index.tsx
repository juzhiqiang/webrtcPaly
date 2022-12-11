import { handleError } from '@/utils';
import { Button, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import styles from './index.less';
interface audioInType {
  id: string;
  kind: string;
  label: string;
}
const HomePage: React.FC = () => {
  // const { name } = useModel('global');

  class initLocalDev {
    audioIn: audioInType[];
    audioOut: audioInType[];
    videoIn: audioInType[];
    constructor() {
      this.audioIn = [];
      this.videoIn = [];
      this.audioOut = [];
    }

    //     { audio: true, video: { facingMode: "user" } }
    // { audio: true, video: { facingMode: { exact: "environment" } } }
    private constraints = {
      video: {
        width: { min: 320, ideal: 1280, max: 1920 },
        height: { min: 240, ideal: 720, max: 1080 },
        // 帧率
        frameReat: {
          ideal: 10,
          max: 15,
        },
      },
      audio: true,
    };

    // 获取媒体设备列表
    private getMediaList = (cb: (obj: any) => void) => {
      // 获取麦克风列表
      navigator.mediaDevices
        .getUserMedia(this.constraints)
        .then((stream: any) => {
          // 默认停止媒体流
          stream
            .getTracks()
            .forEach((trick: { stop: () => any }) => trick.stop());
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              devices.forEach((device) => {
                // 获取每个设备信息
                let obj = {
                  id: device.deviceId,
                  kind: device.kind,
                  label: device.label,
                };
                // 音频输入
                if (device.kind === 'audioinput') {
                  let isAudio = this.audioIn.filter(
                    (e: { id: string }) => e.id === device.deviceId,
                  ).length;
                  if (!isAudio) {
                    this.audioIn.push(obj);
                  }
                }

                // 音频输出
                if (device.kind === 'audiooutput') {
                  let isAudio = this.audioOut.filter(
                    (e: { id: string }) => e.id === device.deviceId,
                  ).length;
                  if (!isAudio) {
                    this.audioOut.push(obj);
                  }
                }
                // 视频输入
                if (device.kind === 'videoinput') {
                  let isAudio = this.videoIn.filter(
                    (e: { id: string }) => e.id === device.deviceId,
                  ).length;
                  if (!isAudio) {
                    this.videoIn.push(obj);
                  }
                }
              });
              cb?.({
                videoIn: this.videoIn,
                audioIn: this.audioIn,
                audioOut: this.audioOut,
              });
            })
            .catch(handleError);
        });
    };

    // 获取设备流信息
    private getLocalUserMedia = async (constraints: MediaStreamConstraints) => {
      return await navigator.mediaDevices.getUserMedia(constraints);
    };

    // 获取指定媒体设备id对应的媒体流
    public getTargetDeviceMedia = async (videoId: string, audioId: string) => {
      console.log(videoId, audioId);
      const constraints = {
        audio: { deviceId: audioId ? { exact: audioId } : undefined },
        video: {
          deviceId: videoId ? { exact: videoId } : undefined,
          width: 1920,
          height: 1080,
          frameRate: { ideal: 10, max: 15 },
        },
      };
      if ((window as any).stream) {
        (window as any).stream.getTracks().forEach((track: any) => {
          track.stop();
        });
      }
      //视频播放流
      return await this.getLocalUserMedia(constraints).catch(handleError);
    };

    // 获取屏幕分享 视频参数必须设置为true
    public getShareMedia = async () => {
      const constraints = {
        video: { width: 1920, height: 1080 },
        audio: false,
      };
      if (window.stream) {
        window.stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      return await navigator.mediaDevices
        .getDisplayMedia(constraints)
        .catch(handleError);
    };

    public init = (fn: () => void) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return console.log('您的浏览器不支持获取媒体设备');
      }
      this.getMediaList(fn);
      return this;
    };
  }

  const [videos, setVideos] = useState<any>([]);
  const [audioIn, setAudioIn] = useState<any>([]);
  const [audioOut, setAudioOut] = useState<any>([]);
  const videoRef = useRef<HTMLVideoElement>();
  const medioRef = useRef<any>();
  const [selectInfo, setSelectInfo] = useState<any>({
    videoId: '',
  });
  const handleChange = (item, type) => {
    setSelectInfo({
      ...selectInfo,
      [type]: item,
    });
  };
  // 媒体信息旋转确定
  const onSubmit = async () => {
    const newStream = await medioRef.current.getTargetDeviceMedia(
      selectInfo.videoId,
      selectInfo.audioId,
    );

    if (videoRef.current) {
      let stream: any = videoRef.current.srcObject;
      // 清除之前流缓存
      if (stream) {
        stream.getAudioTracks().forEach((e: any) => stream.removeTrack(e));
        stream.getVideoTracks().forEach((e: any) => stream.removeTrack(e));
      }
      // 播放最新流
      videoRef.current.srcObject = newStream;
      videoRef.current.muted = true;
    }
  };
  useEffect(() => {
    medioRef.current = new initLocalDev();
    // 设备信息
    medioRef.current.init((info) => {
      setVideos(
        info.videoIn.map((item: any) => ({
          ...item,
          value: item.id,
        })),
      );
      setAudioIn(
        info.audioIn.map((item: any) => ({
          ...item,
          value: item.id,
        })),
      );
      setAudioOut(
        info.audioOut.map((item: any) => ({
          ...item,
          value: item.id,
        })),
      );
      console.log(info);
    });
  }, []);

  return (
    <div>
      <div className={styles.form}>
        <div>
          摄像头：
          <Select
            defaultValue=""
            style={{ width: 120 }}
            onChange={(item) => handleChange(item, 'videoId')}
            options={videos}
          />
        </div>
        <div>
          麦克风：
          <Select
            defaultValue=""
            style={{ width: 120 }}
            onChange={(item) => handleChange(item, 'audioId')}
            options={audioIn}
          />
        </div>
        <div>
          听筒：
          <Select
            defaultValue=""
            style={{ width: 120 }}
            onChange={(item) => handleChange(item, 'audioIs')}
            options={audioOut}
          />
        </div>
        <div>
          分辨率宽高：
          <Input style={{ width: 120 }} value={1920} placeholder="宽度" />*
          <Input style={{ width: 120 }} value={1080} placeholder="高度" />
        </div>
        <div>
          FPS：
          <Input style={{ width: 120 }} value={15} />
        </div>
        <Button type="primary" onClick={onSubmit}>
          确定
        </Button>
      </div>
      <video
        id="video"
        className={styles.video}
        controls
        ref={videoRef}
      ></video>
      ;
    </div>
  );
};

export default HomePage;
