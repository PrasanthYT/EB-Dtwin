import { useState, useEffect, useRef } from "react";
import { 
  ChevronDown, 
  Play, 
  Pause, 
  Mic, 
  Send,
  Bot,
  User,
  Sparkles,
  Heart,
  Brain,
  X
} from "lucide-react";

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      role: "bot",
      content:
        "Hey there! I'm Dr. Lyla, your friendly AI therapist and life guide. 😊 What's your name?",
      audioFile: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [userName, setUserName] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const recognitionRef = useRef(null);
  const tempMessageIdRef = useRef(null);
  const chatContainerRef = useRef(null);

  const hasSetNameRef = useRef(false);

  const toggleChat = () => {
    console.log("Toggling chat. isExpanded:", isExpanded);
    setIsExpanded(!isExpanded);
  };

  const handleSend = async (text) => {
    const messageText = text !== undefined ? text : input;
    console.log("handleSend called with messageText:", messageText);
    if (!messageText.trim()) return;

    if (!hasSetNameRef.current) {
      console.log("Setting user name to:", messageText);
      setUserName(messageText);
      hasSetNameRef.current = true;
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "user", content: messageText, audioFile: "" },
        {
          id: Date.now() + 1,
          role: "bot",
          content: `Nice to meet you, ${messageText}! 😊 What's on your mind today?`,
          audioFile: "",
        },
      ]);
      setInput("");
      return;
    }

    // Function to analyze emotion using NLP Cloud
    const analyzeEmotion = async (text) => {
      try {
        const response = await fetch(
          "https://api.nlpcloud.io/v1/gpu/finetuned-llama-3-70b/sentiment",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: 'Token 193eae775ed15753b1f68d6a1ae141acda03527e',
            },
            body: JSON.stringify({
              text: text,
              target: "NLP Cloud",
            }),
          }
        );

        const data = await response.json();
        console.log("NLP Cloud sentiment response:", data.scored_labels[1].label.toLowerCase());
        return data.scored_labels[1].label.toLowerCase();
      } catch (error) {
        console.error("Error analyzing sentiment:", error);
        return "neutral";
      }
    };

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: messageText,
      audioFile: "",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const emotion = await analyzeEmotion(messageText);
    console.log("Detected emotion:", emotion);
    const systemPrompt = getSystemPrompt(emotion);

    try {
      console.log("Fetching bot response...");
      const response = await fetch(
        "https://api.chai-research.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API_KEY": "75d5c115b7bc4e72b8746c7845a2526f",
          },
          body: JSON.stringify({
            model: "chai_v1",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-10),
              { role: "user", content: messageText },
            ],
            max_tokens: 1000,
          }),
        }
      );

      const json = await response.json();
      console.log("Received API response:", json);
      if (json.choices && json.choices.length > 0) {
        const botResponse = json.choices[0].message.content;
        let audioFile = await generateSpeech(botResponse);

        let words = botResponse.split(" ");
        let typedMessage = "";
        
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "bot", content: "", audioFile },
        ]);
        setIsTyping(false);
        
        for (let i = 0; i < words.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          typedMessage += words[i] + " ";
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { id: Date.now(), role: "bot", content: typedMessage, audioFile },
          ]);
        }

        if (audioFile) {
          handlePlayAudio(audioFile);
        }
      }
    } catch (error) {
      console.error("Error fetching bot response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "bot",
          content: "Oops! Something went wrong. Let's try that again. 😊",
          audioFile: "",
        },
      ]);
      setIsTyping(false);
    }
  };

  const getSystemPrompt = (emotion) => {
    const basePrompt = `You are Dr. Lyla, a compassionate and understanding AI therapist. Your responses are warm, supportive, and human-like. Be professional but friendly. Keep responses concise but meaningful.`;
    const moodPrompts = {
      sad: "The user seems to be feeling sad. Provide gentle support and validation.",
      happy: "The user appears happy. Celebrate with them and explore what's bringing joy.",
      angry: "The user seems angry or frustrated. Acknowledge their feelings and help them process.",
      anxious: "The user appears anxious. Provide calming support and grounding techniques.",
      fear: "The user seems fearful. Offer reassurance and help them feel safe.",
      neutral: "Engage naturally and ask open-ended questions to understand their state.",
    };
    return `${basePrompt} ${moodPrompts[emotion] || moodPrompts.neutral}`;
  };

  const generateSpeech = async (text) => {
    console.log("Generating speech for text:", text);
    try {
      const response = await fetch(
        "https://dtwin.onrender.com/api/speech/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceId: "en-US-iris",
            style: "Neutral",
            text: text,
            rate: 0,
            pitch: 0,
            sampleRate: 48000,
            format: "MP3",
            encodeAsBase64: false,
            modelVersion: "GEN2",
          }),
        }
      );

      const data = await response.json();
      console.log("Received speech data:", data);
      return data.audioFile || "";
    } catch (error) {
      console.error("Error generating speech:", error);
      return "";
    }
  };

  const handlePlayAudio = (audioUrl) => {
    if (!audioUrl) return;
    console.log("Playing audio from URL:", audioUrl);
    setPlayingAudio(audioUrl);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => {
      console.log("Audio playback ended.");
      setPlayingAudio(null);
    };
  };

  // Speech Recognition Setup
  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      console.log("Speech recognition not supported");
      return;
    }
    
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => {
      console.log("Speech recognition started.");
      setIsRecording(true);
      finalTranscript = "";
      setRecognizedText("");
      
      const tempId = Date.now();
      tempMessageIdRef.current = tempId;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: "", audioFile: "" },
      ]);
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const combinedTranscript = finalTranscript + interimTranscript;
      setRecognizedText(combinedTranscript);
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageIdRef.current
            ? { ...msg, content: combinedTranscript }
            : msg
        )
      );
    };

    recognition.onend = () => {
      console.log("Speech recognition ended.");
      setIsRecording(false);
      const transcriptToUse = finalTranscript.trim() || recognizedText.trim();
      
      const tempId = tempMessageIdRef.current;
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      tempMessageIdRef.current = null;
      
      if (transcriptToUse !== "") {
        handleSend(transcriptToUse);
      }
      setRecognizedText("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setRecognizedText("");
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
        >
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6" />
            <span className="hidden group-hover:block text-sm font-medium">Dr. Lyla</span>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex flex-col shadow-2xl z-50">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 p-6 border-b border-white/20 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Dr. Lyla
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-pink-300" />
                  <span className="text-sm text-white/80">AI Therapist</span>
                </div>
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                  Online
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleChat}
            className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all duration-300"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-transparent to-white/30"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } relative group`}
            >
              {/* Bot Avatar */}
              {msg.role === "bot" && (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
              )}
              
              {/* Message Bubble */}
              <div
                className={`max-w-[75%] p-4 rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:shadow-xl ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-lg"
                    : "bg-white/80 text-gray-800 rounded-bl-lg border border-white/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {msg.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                    {!msg.content && msg.audioFile && (
                      <div className="text-sm italic opacity-70">
                        🎵 Voice Message
                      </div>
                    )}
                  </div>
                  
                  {/* Audio Controls */}
                  {msg.audioFile && (
                    <button
                      onClick={() => handlePlayAudio(msg.audioFile)}
                      className={`p-2 rounded-full transition-colors ${
                        msg.role === "user" 
                          ? "hover:bg-white/20" 
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {playingAudio === msg.audioFile ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs mt-2 opacity-60 ${
                  msg.role === "user" ? "text-white" : "text-gray-500"
                }`}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center ml-3 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mr-3 shadow-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl rounded-bl-lg p-4 shadow-lg border border-white/50">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                  </div>
                  <span className="text-sm text-gray-600">Dr. Lyla is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Input Section */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-white/30 p-6 shadow-2xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={userName ? "Share your thoughts..." : "What's your name?"}
                className="w-full p-4 pr-12 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-lg transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            
            {/* Voice Recording Button */}
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`p-4 rounded-2xl transition-all duration-300 shadow-lg ${
                isRecording
                  ? "bg-gradient-to-r from-red-500 to-pink-600 text-white scale-110"
                  : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 hover:from-gray-200 hover:to-gray-300"
              }`}
              title={isRecording ? "Recording..." : "Hold to record voice message"}
            >
              <Mic size={20} className={isRecording ? "animate-pulse" : ""} />
            </button>
            
            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          
          {/* Quick Responses */}
          {!userName && (
            <div className="mt-4 flex flex-wrap gap-2">
              {["I'm feeling anxious", "I need someone to talk to", "I'm having a tough day", "I want to feel better"].map((response) => (
                <button
                  key={response}
                  onClick={() => handleSend(response)}
                  className="px-4 py-2 bg-white/60 hover:bg-white/80 text-gray-700 rounded-full text-sm transition-all duration-300 border border-white/50 hover:border-purple-300 hover:shadow-md"
                >
                  {response}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;