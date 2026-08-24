import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation
import ImageIO

enum EncoderError: Error, CustomStringConvertible {
    case invalidArguments
    case noFrames
    case cannotCreateImage(String)
    case cannotCreatePixelBuffer
    case cannotCreateContext
    case appendFailed(Int)
    case writerFailed(String)

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: swift encode-series-frames.swift <frames-dir> <output.mp4> <fps> <width> <height>"
        case .noFrames:
            return "No JPEG frames were found."
        case .cannotCreateImage(let path):
            return "Could not decode frame: \(path)"
        case .cannotCreatePixelBuffer:
            return "Could not create a video pixel buffer."
        case .cannotCreateContext:
            return "Could not create a Core Graphics drawing context."
        case .appendFailed(let frame):
            return "Could not append frame \(frame)."
        case .writerFailed(let message):
            return "Video writer failed: \(message)"
        }
    }
}

func loadImage(at url: URL) throws -> CGImage {
    guard
        let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
        throw EncoderError.cannotCreateImage(url.path)
    }
    return image
}

func makePixelBuffer(from image: CGImage, width: Int, height: Int, pool: CVPixelBufferPool?) throws -> CVPixelBuffer {
    var optionalBuffer: CVPixelBuffer?
    let status: CVReturn

    if let pool {
        status = CVPixelBufferPoolCreatePixelBuffer(nil, pool, &optionalBuffer)
    } else {
        let attributes: [CFString: Any] = [
            kCVPixelBufferCGImageCompatibilityKey: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey: true,
            kCVPixelBufferWidthKey: width,
            kCVPixelBufferHeightKey: height,
            kCVPixelBufferPixelFormatTypeKey: kCVPixelFormatType_32ARGB
        ]
        status = CVPixelBufferCreate(
            nil,
            width,
            height,
            kCVPixelFormatType_32ARGB,
            attributes as CFDictionary,
            &optionalBuffer
        )
    }

    guard status == kCVReturnSuccess, let pixelBuffer = optionalBuffer else {
        throw EncoderError.cannotCreatePixelBuffer
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else {
        throw EncoderError.cannotCreatePixelBuffer
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipFirst.rawValue)
    guard let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: colorSpace,
        bitmapInfo: bitmapInfo.rawValue
    ) else {
        throw EncoderError.cannotCreateContext
    }

    context.setFillColor(CGColor(red: 247.0 / 255.0, green: 243.0 / 255.0, blue: 235.0 / 255.0, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    return pixelBuffer
}

func waitUntilReady(_ input: AVAssetWriterInput) {
    while !input.isReadyForMoreMediaData {
        Thread.sleep(forTimeInterval: 0.002)
    }
}

do {
    guard CommandLine.arguments.count == 6 else {
        throw EncoderError.invalidArguments
    }

    let framesDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
    guard
        let fps = Int32(CommandLine.arguments[3]), fps > 0,
        let width = Int(CommandLine.arguments[4]), width > 0,
        let height = Int(CommandLine.arguments[5]), height > 0
    else {
        throw EncoderError.invalidArguments
    }

    let fileManager = FileManager.default
    let frames = try fileManager.contentsOfDirectory(
        at: framesDirectory,
        includingPropertiesForKeys: nil,
        options: [.skipsHiddenFiles]
    )
    .filter { $0.pathExtension.lowercased() == "jpg" || $0.pathExtension.lowercased() == "jpeg" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

    guard !frames.isEmpty else {
        throw EncoderError.noFrames
    }

    if fileManager.fileExists(atPath: outputURL.path) {
        try fileManager.removeItem(at: outputURL)
    }
    try fileManager.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    let compression: [String: Any] = [
        AVVideoAverageBitRateKey: 6_500_000,
        AVVideoExpectedSourceFrameRateKey: Int(fps),
        AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
    ]
    let outputSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: compression
    ]

    let input = AVAssetWriterInput(mediaType: .video, outputSettings: outputSettings)
    input.expectsMediaDataInRealTime = false

    let sourceAttributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: sourceAttributes
    )

    guard writer.canAdd(input) else {
        throw EncoderError.writerFailed("The H.264 input configuration is not supported.")
    }
    writer.add(input)

    guard writer.startWriting() else {
        throw EncoderError.writerFailed(writer.error?.localizedDescription ?? "Unable to start writing.")
    }
    writer.startSession(atSourceTime: .zero)

    for (index, frameURL) in frames.enumerated() {
        waitUntilReady(input)
        let image = try loadImage(at: frameURL)
        let pixelBuffer = try makePixelBuffer(from: image, width: width, height: height, pool: adaptor.pixelBufferPool)
        let presentationTime = CMTime(value: Int64(index), timescale: fps)
        guard adaptor.append(pixelBuffer, withPresentationTime: presentationTime) else {
            throw EncoderError.appendFailed(index)
        }

        if index % Int(fps * 5) == 0 {
            let seconds = Double(index) / Double(fps)
            fputs(String(format: "Encoded %.0f seconds\n", seconds), stderr)
        }
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
        semaphore.signal()
    }
    semaphore.wait()

    guard writer.status == .completed else {
        throw EncoderError.writerFailed(writer.error?.localizedDescription ?? "Unknown writer error.")
    }

    print(outputURL.path)
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
