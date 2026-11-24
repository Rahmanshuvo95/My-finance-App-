import React, { useEffect, useRef, useState } from 'react';

const PREVIEW_SIZE = 280;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function AvatarCropper({ file, busy, onCancel, onSave }) {
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [readError, setReadError] = useState('');
  const drag = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const photo = new Image();
    photo.onload = () => setImage(photo);
    photo.onerror = () => setReadError('This image could not be opened. Try another image format.');
    photo.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = image ? Math.max(PREVIEW_SIZE / image.width, PREVIEW_SIZE / image.height) : 1;
  const scale = baseScale * zoom;
  const imageWidth = image ? image.width * scale : PREVIEW_SIZE;
  const imageHeight = image ? image.height * scale : PREVIEW_SIZE;
  const clampOffset = (point, nextScale = scale) => {
    if (!image) return point;
    const maxX = Math.max(0, (image.width * nextScale - PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (image.height * nextScale - PREVIEW_SIZE) / 2);
    return { x: clamp(point.x, -maxX, maxX), y: clamp(point.y, -maxY, maxY) };
  };
  function beginDrag(event) {
    if (!image || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y };
  }
  function moveDrag(event) {
    if (!drag.current) return;
    setOffset(clampOffset({ x: drag.current.offsetX + event.clientX - drag.current.x, y: drag.current.offsetY + event.clientY - drag.current.y }));
  }
  function endDrag() { drag.current = null; }
  function changeZoom(event) {
    const nextZoom = Number(event.target.value);
    const nextScale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset(current => clampOffset(current, nextScale));
  }
  function saveCrop() {
    if (!image || busy) return;
    const sourceSize = PREVIEW_SIZE / scale;
    const sourceX = clamp((image.width - sourceSize) / 2 - offset.x / scale, 0, image.width - sourceSize);
    const sourceY = clamp((image.height - sourceSize) / 2 - offset.y / scale, 0, image.height - sourceSize);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) { setReadError('Photo editing is unavailable in this browser.'); return; }
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);
    canvas.toBlob(blob => blob ? onSave(blob) : setReadError('Could not prepare this image. Try another one.'), 'image/webp', 0.88);
  }

  return <div className="avatar-crop-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
    <section className="avatar-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
      <div className="avatar-crop-heading"><div><p className="eyebrow">PROFILE PHOTO</p><h2 id="avatar-crop-title">Crop your photo</h2></div><button type="button" className="icon-button" aria-label="Close photo editor" onClick={onCancel} disabled={busy}>×</button></div>
      <p className="avatar-crop-help">Drag to position, then adjust the zoom. The round preview shows how your profile photo will look.</p>
      <div className="avatar-crop-stage" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} role="img" aria-label="Drag to position your profile photo">
        {image&&<img src={image.src} alt="" draggable="false" style={{ width:imageWidth, height:imageHeight, transform:`translate(calc(-50% + ${offset.x}px),calc(-50% + ${offset.y}px))` }}/> }
        <span className="avatar-crop-circle" aria-hidden="true"/>
        {!image&&!readError&&<span className="muted">Preparing preview…</span>}
      </div>
      <label className="avatar-zoom-control">Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={changeZoom} disabled={!image||busy}/></label>
      {readError&&<p className="alert avatar-crop-error" role="alert">{readError}</p>}
      <p className="avatar-crop-output">Saved as a private 512 × 512 WebP image.</p>
      <div className="avatar-crop-actions"><button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="button" className="primary" onClick={saveCrop} disabled={!image||busy}>{busy?'Uploading…':'Use this photo'}</button></div>
    </section>
  </div>;
}
