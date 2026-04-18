import { Camera, QrCode, X, CheckCircle } from "lucide-react";

export function PortalQRCheckin({
  sessionCode, setSessionCode,
  checkInLoading, checkInResult,
  handleQrCheckIn,
  cameraActive, videoRef, canvasRef,
  startCamera, stopCamera, cameraError,
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#002EB8]/10 rounded-full flex items-center justify-center">
            <QrCode size={20} className="text-[#002EB8]" />
          </div>
          <div>
            <h3 className="font-cabinet font-bold text-base text-[#0A0A0A]">QR Code Attendance Check-in</h3>
            <p className="text-xs text-[#8A8F98]">Scan the QR code with your camera or enter session code</p>
          </div>
        </div>

        {/* Camera scanner */}
        <div className="mb-4">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              data-testid="start-camera-btn"
              className="flex items-center gap-2 px-4 py-2.5 border border-[#002EB8] text-[#002EB8] text-sm rounded-md hover:bg-[#002EB8]/5 font-medium transition-colors w-full justify-center"
            >
              <Camera size={16} /> Scan QR with Camera
            </button>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-[#002EB8]">
              <video ref={videoRef} muted playsInline className="w-full max-h-56 object-cover" data-testid="qr-video" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 border-2 border-white rounded-lg opacity-70" />
              </div>
              <button
                onClick={stopCamera}
                data-testid="stop-camera-btn"
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
              >
                <X size={14} />
              </button>
              <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white bg-black/40 py-1">
                Point camera at the QR code
              </p>
            </div>
          )}
          {cameraError && <p className="text-xs text-[#FF2B2B] mt-2">{cameraError}</p>}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-xs text-[#8A8F98]">or enter session code manually</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        <form onSubmit={handleQrCheckIn} className="space-y-4" data-testid="qr-checkin-form">
          <div>
            <label className="text-xs font-mono uppercase tracking-[0.15em] text-[#8A8F98] block mb-1.5">Session Code</label>
            <input
              type="text"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value)}
              placeholder="Paste or type the session code from teacher's QR..."
              required
              data-testid="session-code-input"
              className="w-full border border-[#E5E7EB] rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#002EB8]"
            />
            <p className="text-xs text-[#8A8F98] mt-1">Ask your teacher for the Session ID displayed on their QR code panel</p>
          </div>
          <button
            type="submit"
            disabled={checkInLoading || !sessionCode.trim()}
            data-testid="qr-checkin-submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#002EB8] text-white text-sm rounded-md hover:bg-[#001A85] disabled:bg-[#8A8F98] transition-colors font-medium"
          >
            {checkInLoading ? "Checking in..." : <><CheckCircle size={14} /> Mark Attendance</>}
          </button>
        </form>

        {checkInResult && (
          <div
            className={`mt-4 p-4 rounded-lg border flex items-center gap-3 ${checkInResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
            data-testid="checkin-result"
          >
            {checkInResult.success
              ? <CheckCircle size={18} className="text-[#00C853] shrink-0" />
              : <X size={18} className="text-[#FF2B2B] shrink-0" />}
            <p className={`text-sm font-medium ${checkInResult.success ? "text-green-800" : "text-red-800"}`}>
              {checkInResult.message}
            </p>
          </div>
        )}
      </div>

      <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg p-4 text-xs text-[#8A8F98] space-y-1">
        <p className="font-medium text-[#0A0A0A] text-sm mb-2">How to check in</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Your teacher will display a QR code at the start of class</li>
          <li>Tap "Scan QR with Camera" above and point at the QR code</li>
          <li>Attendance is marked automatically once scanned</li>
          <li>Or ask your teacher for the Session ID and enter it manually</li>
        </ol>
      </div>
    </div>
  );
}
