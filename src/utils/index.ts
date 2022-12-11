// 摄像头异常抛出
export const handleError = (err: { message: any; name: any }) => {
  alert('摄像头无法正常使用，请检查是否占用或缺失');
  console.error(
    'navigator.MediaDevices.getUserMedia error: ',
    err.message,
    err.name,
  );
};
