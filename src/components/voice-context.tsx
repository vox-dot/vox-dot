import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

// Define our context types
type VoiceState = "inactive" | "listening" | "processing" | "error";
type CommandType = "color" | "shape" | "speed" | "reset" | "none";

interface VoiceContextType {
  voiceState: VoiceState;
  transcript: string;
  confidence: number;
  isListening: boolean;
  errorMessage: string;
  startListening: () => void;
  stopListening: () => void;
  detectedCommand: CommandType;
  commandValue: string;
  volume: number;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>("inactive");
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recognition, setRecognition] = useState<any | null>(null);
  const [detectedCommand, setDetectedCommand] = useState<CommandType>("none");
  const [commandValue, setCommandValue] = useState("");
  const [volume, setVolume] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (
      (typeof window !== "undefined" && "SpeechRecognition" in window) ||
      "webkitSpeechRecognition" in window
    ) {
      // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      setRecognition(recognitionInstance);
      startListening(recognitionInstance);
    } else {
      setErrorMessage("Speech recognition not supported in this browser.");
      setVoiceState("error");
    }
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Setup audio analyzer for volume detection
  useEffect(() => {
    if (isListening && !audioContext) {
      const setupAudio = async () => {
        try {
          const context = new AudioContext();
          const analyzer = context.createAnalyser();
          analyzer.fftSize = 1024;

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const source = context.createMediaStreamSource(stream);
          source.connect(analyzer);

          setAudioContext(context);
          setAnalyser(analyzer);

          // Process audio data
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          const updateVolume = () => {
            if (analyser) {
              analyser.getByteFrequencyData(dataArray);
              // Calculate average volume
              const average =
                dataArray.reduce((sum, value) => sum + value, 0) /
                dataArray.length;
              setVolume(average / 255); // Normalize to 0-1
            }

            if (isListening) {
              requestAnimationFrame(updateVolume);
            }
          };

          updateVolume();
        } catch (err) {
          console.error("Error accessing microphone:", err);
          setErrorMessage("Microphone access denied.");
          setVoiceState("error");
          setIsListening(false);
        }
      };

      setupAudio();
    }

    return () => {
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
        setAnalyser(null);
      }
    };
  }, [isListening]);

  // Parse commands from transcript
  useEffect(() => {
    console.log("Processing transcript:", transcript);
    if (transcript) {
      const lowerTranscript = transcript.toLowerCase();
        console.log("Lowercase transcript:", lowerTranscript);
      // Check for color commands
      const colorWords = [
        "blue",
        "red",
        "green",
        "purple",
        "yellow",
        "orange",
        "pink",
        "teal",
      ];
      if (lowerTranscript.includes("color") || lowerTranscript.includes("colour")) {
        console.log("Checking for color commands in:", lowerTranscript);
        for (const color of colorWords) {
          if (lowerTranscript.includes(color)) {
            console.log("Detected color command:", color);
            setDetectedCommand("color");
            setCommandValue(color);
            return;
          }
        }
      } else if (colorWords.includes(lowerTranscript)) {
        for (const color of colorWords) {
          if (lowerTranscript.includes(color)) {
            console.log("Detected color command:", color);
            setDetectedCommand("color");
            setCommandValue(color);
            return;
          }
        }
      }

      // Check for shape commands
      if (lowerTranscript.includes("shape")) {
        const shapeWords = ["sphere", "cube", "spiral", "wave", "particles"];
        for (const shape of shapeWords) {
          if (lowerTranscript.includes(shape)) {
            setDetectedCommand("shape");
            setCommandValue(shape);
            return;
          }
        }
      }

      // Check for speed commands
      if (lowerTranscript.includes("speed")) {
        const speedWords = ["slow", "fast", "medium", "faster", "slower"];
        for (const speed of speedWords) {
          if (lowerTranscript.includes(speed)) {
            setDetectedCommand("speed");
            setCommandValue(speed);
            return;
          }
        }
      }

      // Check for reset command
      if (lowerTranscript.includes("reset")) {
        setDetectedCommand("reset");
        setCommandValue("reset");
        return;
      }
    }
  }, [transcript]);

  // Handle speech recognition events
  useEffect(() => {
    if (!recognition) return;

    recognition.onstart = () => {
      setVoiceState("listening");
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript;
        console.log("Speech recognition result:", text);
      setTranscript(text);
      setConfidence(result[0].confidence);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      // Handle 'no-speech' error differently
      if (event.error === "no-speech") {
        // Just log the error but don't change the state
        setErrorMessage("Waiting for speech...");
        return;
      }

      // For all other errors, set error state and stop listening
      setErrorMessage(`Error: ${event.error}`);
      setVoiceState("error");
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start();
      } else {
        setVoiceState("inactive");
      }
    };
  }, [recognition, isListening]);

  const startListening = useCallback((recognition?: any) => {
    console.log("Starting voice recognition...", recognition, isListening);
    if (recognition && !isListening) {
      setErrorMessage("");
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting recognition:", error);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setVoiceState("inactive");
    }
  }, [recognition, isListening]);

  return (
    <VoiceContext.Provider
      value={{
        voiceState,
        transcript,
        confidence,
        isListening,
        errorMessage,
        startListening,
        stopListening,
        detectedCommand,
        commandValue,
        volume,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
};
