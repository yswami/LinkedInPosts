import AVFoundation
import Foundation

enum MixError: Error, CustomStringConvertible {
    case invalidArguments
    case missingTrack(String)
    case cannotCreateTrack(String)
    case cannotCreateExporter(String)
    case exportFailed(String)

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: swift mix-series-audio.swift <silent.mp4> <output.mp4> <output.m4a> <bed.caf> <start> <segment.aiff> ..."
        case .missingTrack(let label):
            return "Missing media track: \(label)"
        case .cannotCreateTrack(let label):
            return "Could not create composition track: \(label)"
        case .cannotCreateExporter(let label):
            return "Could not create exporter: \(label)"
        case .exportFailed(let message):
            return "Export failed: \(message)"
        }
    }
}

func export(_ session: AVAssetExportSession, to outputURL: URL, type: AVFileType) async throws {
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: outputURL.path) {
        try fileManager.removeItem(at: outputURL)
    }
    session.shouldOptimizeForNetworkUse = true
    try await session.export(to: outputURL, as: type)
}

do {
    guard CommandLine.arguments.count >= 7, (CommandLine.arguments.count - 5).isMultiple(of: 2) else {
        throw MixError.invalidArguments
    }

    let silentVideoURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
    let audioOutputURL = URL(fileURLWithPath: CommandLine.arguments[3])
    let bedURL = URL(fileURLWithPath: CommandLine.arguments[4])
    var segments: [(start: Double, url: URL)] = []
    var argumentIndex = 5
    while argumentIndex < CommandLine.arguments.count {
        guard let start = Double(CommandLine.arguments[argumentIndex]) else {
            throw MixError.invalidArguments
        }
        segments.append((start, URL(fileURLWithPath: CommandLine.arguments[argumentIndex + 1])))
        argumentIndex += 2
    }

    let silentAsset = AVURLAsset(url: silentVideoURL)
    let silentDuration = try await silentAsset.load(.duration)
    let audioComposition = AVMutableComposition()
    var audioParameters: [AVMutableAudioMixInputParameters] = []

    let bedAsset = AVURLAsset(url: bedURL)
    guard let bedSource = try await bedAsset.loadTracks(withMediaType: .audio).first else {
        throw MixError.missingTrack("sound bed")
    }
    guard let bedTrack = audioComposition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw MixError.cannotCreateTrack("sound bed")
    }
    let bedDuration = min(try await bedAsset.load(.duration), silentDuration)
    try bedTrack.insertTimeRange(CMTimeRange(start: .zero, duration: bedDuration), of: bedSource, at: .zero)
    let bedMix = AVMutableAudioMixInputParameters(track: bedTrack)
    bedMix.setVolume(0.72, at: .zero)
    bedMix.setVolumeRamp(fromStartVolume: 0.72, toEndVolume: 0.0, timeRange: CMTimeRange(start: CMTime(seconds: 57.5, preferredTimescale: 600), duration: CMTime(seconds: 2.5, preferredTimescale: 600)))
    audioParameters.append(bedMix)

    for (index, segment) in segments.enumerated() {
        let asset = AVURLAsset(url: segment.url)
        guard let source = try await asset.loadTracks(withMediaType: .audio).first else {
            throw MixError.missingTrack("narration segment \(index + 1)")
        }
        guard let track = audioComposition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw MixError.cannotCreateTrack("narration segment \(index + 1)")
        }

        let start = CMTime(seconds: segment.start, preferredTimescale: 600)
        let available = CMTimeSubtract(silentDuration, start)
        let duration = min(try await asset.load(.duration), available)
        try track.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: source, at: start)

        let parameters = AVMutableAudioMixInputParameters(track: track)
        parameters.setVolume(1.0, at: start)
        let fadeDuration = min(CMTime(seconds: 0.12, preferredTimescale: 600), duration)
        parameters.setVolumeRamp(fromStartVolume: 0.0, toEndVolume: 1.0, timeRange: CMTimeRange(start: start, duration: fadeDuration))
        let fadeStart = CMTimeAdd(start, CMTimeSubtract(duration, fadeDuration))
        parameters.setVolumeRamp(fromStartVolume: 1.0, toEndVolume: 0.0, timeRange: CMTimeRange(start: fadeStart, duration: fadeDuration))
        audioParameters.append(parameters)
    }

    let audioMix = AVMutableAudioMix()
    audioMix.inputParameters = audioParameters
    guard let audioExporter = AVAssetExportSession(asset: audioComposition, presetName: AVAssetExportPresetAppleM4A) else {
      throw MixError.cannotCreateExporter("audio mix")
    }
    audioExporter.audioMix = audioMix
    try FileManager.default.createDirectory(at: audioOutputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try await export(audioExporter, to: audioOutputURL, type: .m4a)

    let finalComposition = AVMutableComposition()
    guard let videoSource = try await silentAsset.loadTracks(withMediaType: .video).first else {
        throw MixError.missingTrack("video")
    }
    guard let videoTrack = finalComposition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw MixError.cannotCreateTrack("video")
    }
    try videoTrack.insertTimeRange(CMTimeRange(start: .zero, duration: silentDuration), of: videoSource, at: .zero)
    videoTrack.preferredTransform = try await videoSource.load(.preferredTransform)

    let mixedAudioAsset = AVURLAsset(url: audioOutputURL)
    guard let mixedAudioSource = try await mixedAudioAsset.loadTracks(withMediaType: .audio).first else {
        throw MixError.missingTrack("mixed audio")
    }
    guard let mixedAudioTrack = finalComposition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw MixError.cannotCreateTrack("mixed audio")
    }
    let mixedAudioDuration = min(try await mixedAudioAsset.load(.duration), silentDuration)
    try mixedAudioTrack.insertTimeRange(CMTimeRange(start: .zero, duration: mixedAudioDuration), of: mixedAudioSource, at: .zero)

    guard let finalExporter = AVAssetExportSession(asset: finalComposition, presetName: AVAssetExportPresetPassthrough) else {
        throw MixError.cannotCreateExporter("final video")
    }
    try FileManager.default.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    try await export(finalExporter, to: outputURL, type: .mp4)
    print(audioOutputURL.path)
    print(outputURL.path)
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
