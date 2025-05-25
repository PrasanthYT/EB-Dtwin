import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const FoodScanner = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log("Stream obtained:", stream);
      console.log("Video element:", videoRef.current);

      setCameraStream(stream);
      setIsCapturing(true);
    } catch (err) {
      setError(
        "Camera access denied. Please allow camera permissions or use file upload instead."
      );
      console.error("Camera error:", err);
    }
  }, []);

  // Effect to assign stream to video element when both are available
  useEffect(() => {
    if (cameraStream && videoRef.current && isCapturing) {
      videoRef.current.srcObject = cameraStream;
      console.log("Stream assigned to video element");
    }
  }, [cameraStream, isCapturing]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCapturing(false);
  }, [cameraStream]);

  // Capture photo from camera with compression
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set reasonable dimensions to reduce file size
      const maxWidth = 800;
      const maxHeight = 600;

      let { videoWidth, videoHeight } = video;

      // Calculate new dimensions maintaining aspect ratio
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth *= ratio;
        videoHeight *= ratio;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Use higher compression (lower quality) to reduce file size
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target.result.split(",")[1]; // Remove data URL prefix
            setCapturedImage({
              blob,
              base64,
              url: e.target.result,
            });
            stopCamera();
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.6
      ); // Reduced quality from 0.8 to 0.6 for smaller file size
    }
  }, [stopCamera]);

  // Handle file upload with compression
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      // Create a canvas to compress the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Set maximum dimensions
        const maxWidth = 800;
        const maxHeight = 600;

        let { width, height } = img;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64 = e.target.result.split(",")[1];
              setCapturedImage({
                file: blob,
                base64,
                url: e.target.result,
              });
              setError(null);
            };
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.6
        );
      };

      img.src = URL.createObjectURL(file);
    } else {
      setError("Please select a valid image file");
    }
  }, []);

  // Send image to backend for analysis
  const analyzeFood = useCallback(async () => {
    if (!capturedImage?.base64) return;

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      // Get the token from wherever you store it (localStorage, context, etc.)
      const token = localStorage.getItem("authToken"); // or from your auth context

      const response = await fetch("http://localhost:4000/api/food/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add the authorization header
        },
        body: JSON.stringify({
          base64Image: capturedImage.base64,
          confidenceThreshold: 0.5,
          maxPredictions: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze food");
      }

      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.message || "Failed to analyze food");
      }
    } catch (err) {
      setError(err.message || "Network error. Please check your connection.");
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [capturedImage]);

  // Reset all states
  const reset = useCallback(() => {
    setCapturedImage(null);
    setResults(null);
    setError(null);
    setIsLoading(false);
    stopCamera();
  }, [stopCamera]);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <h1 className="text-xl font-bold text-center">Food Scanner</h1>
        <p className="text-blue-100 text-sm text-center mt-1">
          Take a photo or upload an image to identify food
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Camera View */}
        {isCapturing && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg"
              style={{ transform: "scaleX(-1)" }} // Mirror effect
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
              <button
                onClick={capturePhoto}
                className="bg-white hover:bg-gray-100 rounded-full p-3 shadow-lg transition-colors"
              >
                <Camera className="h-6 w-6 text-gray-700" />
              </button>
              <button
                onClick={stopCamera}
                className="bg-red-500 hover:bg-red-600 rounded-full p-3 shadow-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Captured Image Display */}
        {capturedImage && !isCapturing && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={capturedImage.url}
                alt="Captured food"
                className="w-full rounded-lg shadow-md"
              />
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-2 shadow-lg transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {!results && !isLoading && (
              <button
                onClick={analyzeFood}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Analyze Food
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!capturedImage && !isCapturing && (
          <div className="space-y-3">
            <button
              onClick={startCamera}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </button>

            <div className="relative">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-blue-700 font-medium">Analyzing your food...</p>
            <p className="text-blue-600 text-sm mt-1">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-green-700 font-medium">Analysis Complete!</p>
            </div>

            {results.detectedItems && results.detectedItems.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-gray-800">
                    Detected Food Items
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {results.detectedItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.foodName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Confidence: {Math.round(item.confidence * 100)}%
                        </p>
                      </div>
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-700">
                  No food items detected in this image.
                </p>
                <p className="text-yellow-600 text-sm mt-1">
                  Try taking another photo with better lighting.
                </p>
              </div>
            )}

            {results.metadata && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">
                  Scan completed at{" "}
                  {new Date(results.metadata.scanTime).toLocaleTimeString()}
                </p>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Scan Another Image
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FoodScanner;
