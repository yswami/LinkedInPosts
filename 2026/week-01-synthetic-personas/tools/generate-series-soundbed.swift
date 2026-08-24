import AVFoundation
import Foundation

enum SoundbedError: Error, CustomStringConvertible {
    case invalidArguments
    case cannotCreateFormat
    case cannotCreateBuffer

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: swift generate-series-soundbed.swift <output.caf>"
        case .cannotCreateFormat:
            return "Could not create the audio format."
        case .cannotCreateBuffer:
            return "Could not create the audio buffer."
        }
    }
}

func midiFrequency(_ note: Double) -> Double {
    440.0 * pow(2.0, (note - 69.0) / 12.0)
}

func smooth(_ value: Double) -> Double {
    let point = min(1.0, max(0.0, value))
    return point * point * (3.0 - 2.0 * point)
}

do {
    guard CommandLine.arguments.count == 2 else {
        throw SoundbedError.invalidArguments
    }

    let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let fileManager = FileManager.default
    if fileManager.fileExists(atPath: outputURL.path) {
        try fileManager.removeItem(at: outputURL)
    }
    try fileManager.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)

    let sampleRate = 44_100.0
    let duration = 60.0
    let channelCount: AVAudioChannelCount = 2
    guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: channelCount) else {
        throw SoundbedError.cannotCreateFormat
    }

    let file = try AVAudioFile(forWriting: outputURL, settings: format.settings)
    let frameCapacity: AVAudioFrameCount = 4_096
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCapacity) else {
        throw SoundbedError.cannotCreateBuffer
    }

    let chords: [[Double]] = [
        [48, 55, 64], // C major
        [45, 52, 60], // A minor
        [41, 48, 57], // F major
        [43, 50, 60], // G suspended
        [48, 55, 64]  // Resolve to C
    ]
    let chordBoundaries = [0.0, 13.0, 25.0, 37.0, 50.0, 60.0]
    let transitions = [0.5, 6.2, 13.2, 22.2, 33.2, 42.2, 51.2]
    let bellNotes = [72.0, 76.0, 79.0, 74.0, 77.0, 81.0, 84.0]
    var renderedFrames: AVAudioFramePosition = 0
    let totalFrames = AVAudioFramePosition(duration * sampleRate)

    while renderedFrames < totalFrames {
        let remaining = totalFrames - renderedFrames
        let framesThisPass = AVAudioFrameCount(min(AVAudioFramePosition(frameCapacity), remaining))
        buffer.frameLength = framesThisPass
        guard let channels = buffer.floatChannelData else {
            throw SoundbedError.cannotCreateBuffer
        }

        for frame in 0..<Int(framesThisPass) {
            let absoluteFrame = renderedFrames + AVAudioFramePosition(frame)
            let time = Double(absoluteFrame) / sampleRate
            var chordIndex = 0
            for index in 0..<(chordBoundaries.count - 1) where time >= chordBoundaries[index] {
                chordIndex = min(index, chords.count - 1)
            }

            let chord = chords[chordIndex]
            var pad = 0.0
            for (index, note) in chord.enumerated() {
                let frequency = midiFrequency(note)
                let phase = Double(index) * 0.73
                pad += sin(2.0 * .pi * frequency * time + phase)
                pad += 0.22 * sin(2.0 * .pi * frequency * 2.0 * time + phase * 1.7)
            }
            pad /= Double(chord.count) * 1.22

            let chordStart = chordBoundaries[chordIndex]
            let chordEnd = chordBoundaries[min(chordIndex + 1, chordBoundaries.count - 1)]
            let chordEnvelope = smooth((time - chordStart) / 1.3) * smooth((chordEnd - time) / 1.3)
            let masterEnvelope = smooth(time / 1.8) * smooth((duration - time) / 2.6)
            var bellLeft = 0.0
            var bellRight = 0.0

            for (index, transition) in transitions.enumerated() {
                let delta = time - transition
                if delta >= 0.0 && delta < 1.7 {
                    let decay = exp(-3.2 * delta)
                    let frequency = midiFrequency(bellNotes[index])
                    let bell = decay * (
                        sin(2.0 * .pi * frequency * delta) +
                        0.38 * sin(2.0 * .pi * frequency * 2.01 * delta)
                    )
                    let pan = index.isMultiple(of: 2) ? 0.72 : 0.42
                    bellLeft += bell * pan
                    bellRight += bell * (1.0 - pan + 0.25)
                }
            }

            let slowPulse = 0.72 + 0.28 * sin(2.0 * .pi * 0.075 * time)
            let base = pad * chordEnvelope * masterEnvelope * slowPulse * 0.052
            channels[0][frame] = Float(base + bellLeft * 0.035)
            channels[1][frame] = Float(base + bellRight * 0.035)
        }

        try file.write(from: buffer)
        renderedFrames += AVAudioFramePosition(framesThisPass)
    }

    print(outputURL.path)
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
