import AVFoundation
import ExpoModulesCore

public class QRScannerView: ExpoView, AVCaptureMetadataOutputObjectsDelegate {
    let onScan  = EventDispatcher()
    let onError = EventDispatcher()

    private var captureSession: AVCaptureSession?
    private var previewLayer:   AVCaptureVideoPreviewLayer?
    private var isRunning = false

    public required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        setupSession()
    }

    override public func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }

    private func setupSession() {
        let session = AVCaptureSession()
        guard
            let device = AVCaptureDevice.default(for: .video),
            let input  = try? AVCaptureDeviceInput(device: device),
            session.canAddInput(input)
        else {
            onError(["message": "Camera unavailable or permission denied."])
            return
        }
        session.addInput(input)

        let metaOutput = AVCaptureMetadataOutput()
        guard session.canAddOutput(metaOutput) else { return }
        session.addOutput(metaOutput)
        metaOutput.setMetadataObjectsDelegate(self, queue: .main)
        metaOutput.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        layer.insertSublayer(preview, at: 0)
        previewLayer  = preview
        captureSession = session
    }

    func start() {
        guard !isRunning, let session = captureSession else { return }
        isRunning = true
        DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
    }

    func stop() {
        guard isRunning, let session = captureSession else { return }
        isRunning = false
        session.stopRunning()
    }

    // AVCaptureMetadataOutputObjectsDelegate
    public func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard
            let readable = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
            let value    = readable.stringValue
        else { return }
        stop()
        onScan(["value": value])
    }
}
