window.__rrwebEvents = window.__rrwebEvents || [];

function bootReelCapture() {
  if (document.body && !document.getElementById("reel-cursor")) {
    const cursor = document.createElement("div");
    cursor.id = "reel-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "width:14px",
      "height:14px",
      "margin-left:-7px",
      "margin-top:-7px",
      "border:2px solid #fff",
      "border-radius:50%",
      "box-shadow:0 0 0 1px #111",
      "pointer-events:none",
      "left:40px",
      "top:40px",
    ].join(";");
    document.body.appendChild(cursor);
    window.addEventListener(
      "mousemove",
      (event) => {
        cursor.style.left = event.clientX + "px";
        cursor.style.top = event.clientY + "px";
      },
      true,
    );
  }
  const recorder = window.rrweb;
  if (recorder && typeof recorder.record === "function" && !window.__rrwebRecording) {
    window.__rrwebRecording = recorder.record({
      emit(event) {
        window.__rrwebEvents.push(event);
      },
    });
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootReelCapture);
else bootReelCapture();
