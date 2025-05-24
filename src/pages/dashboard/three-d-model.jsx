import React, { Suspense, useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Stage, Html, Center } from "@react-three/drei";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Sample medical conditions with NIH node names
const MEDICAL_CONDITIONS = [
  {
    id: 1,
    name: "Cardiovascular Disease",
    affectedParts: ["heart", "vascular system", "blood vasculature"],
    description:
      "Affects the heart and blood vessels, including coronary artery disease and heart failure",
    severity: "Severe",
    color: "#ff0000", // Red for cardiovascular
  },
  {
    id: 2,
    name: "Respiratory Condition",
    affectedParts: [
      "respiratory system",
      "extrapulmonary bronchus",
      "main bronchus",
      "trachea",
    ],
    description:
      "Condition affecting the lungs and airways, such as asthma or COPD",
    severity: "Moderate",
    color: "#4169e1", // Royal Blue for respiratory
  },
  {
    id: 3,
    name: "Digestive System Issue",
    affectedParts: ["small intestine", "large intestine", "liver", "pancreas"],
    description:
      "Affects the digestive tract, including conditions like IBS or Crohn's disease",
    severity: "Mild",
    color: "#32cd32", // Lime Green for digestive
  },
  {
    id: 4,
    name: "Knee Injury",
    affectedParts: ["left knee", "right knee"],
    description: "Injury or degenerative condition affecting one or both knees",
    severity: "Moderate",
    color: "#ffa500", // Orange for musculoskeletal
  },
  {
    id: 5,
    name: "Neurological Condition",
    affectedParts: ["brain", "spinal cord"],
    description:
      "Affects the central nervous system, including conditions like MS or epilepsy",
    severity: "Severe",
    color: "#800080", // Purple for neurological
  },
];

// Map of node names to their human-readable labels
const NODE_DISPLAY_NAMES = {
  "blood vasculature": "Blood Vessels",
  "body proper": "Body",
  brain: "Brain",
  "extrapulmonary bronchus": "Bronchi",
  heart: "Heart",
  "large intestine": "Large Intestine",
  "left eye": "Left Eye",
  "left kidney": "Left Kidney",
  "left knee": "Left Knee",
  "left ureter": "Left Ureter",
  liver: "Liver",
  "main bronchus": "Main Bronchus",
  "male reproductive system": "Reproductive System",
  "mesenteric lymph node": "Lymph Nodes",
  pancreas: "Pancreas",
  pelvis: "Pelvis",
  "respiratory system": "Respiratory System",
  "right eye": "Right Eye",
  "right kidney": "Right Kidney",
  "right knee": "Right Knee",
  "right ureter": "Right Ureter",
  skin: "Skin",
  "skin of body": "Skin",
  "small intestine": "Small Intestine",
  "spinal cord": "Spinal Cord",
  spleen: "Spleen",
  "thoracic thymus": "Thymus",
  thymus: "Thymus",
  trachea: "Trachea",
  "urinary bladder": "Bladder",
  "vascular system": "Vascular System",
};

// Fallback model when real model fails to load
function FallbackHumanModel({ highlightedParts, highlightColor }) {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial
          color={
            highlightedParts.includes("brain") ? highlightColor : "#b0c4de"
          }
        />
      </mesh>

      {/* Arms */}
      <mesh position={[0.7, 0.2, 0]}>
        <capsuleGeometry
          args={[0.15, 0.7, 8, 16]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>
      <mesh position={[-0.7, 0.2, 0]}>
        <capsuleGeometry
          args={[0.15, 0.7, 8, 16]}
          rotation={[0, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>

      {/* Legs */}
      <mesh position={[0.25, -1.1, 0]}>
        <capsuleGeometry args={[0.17, 0.8, 8, 16]} />
        <meshStandardMaterial
          color={
            highlightedParts.includes("right knee") ? highlightColor : "#b0c4de"
          }
        />
      </mesh>
      <mesh position={[-0.25, -1.1, 0]}>
        <capsuleGeometry args={[0.17, 0.8, 8, 16]} />
        <meshStandardMaterial
          color={
            highlightedParts.includes("left knee") ? highlightColor : "#b0c4de"
          }
        />
      </mesh>
    </group>
  );
}

// Error Boundary component for the 3D model
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function HumanModel({ highlightedParts, modelUrl, highlightColor }) {
  const group = useRef();
  const { nodes, materials } = useGLTF(modelUrl);
  const [hovered, setHovered] = useState(null);

  // Store original materials for restoration
  const originalMaterials = useRef({});
  const partsMap = useRef({});
  const [isModelProcessed, setIsModelProcessed] = useState(false);

  // Process model once on load
  useEffect(() => {
    if (!nodes) return;

    // Map each node to its material
    Object.keys(nodes).forEach((nodeName) => {
      const node = nodes[nodeName];
      if (node.isMesh && node.material) {
        // Save original material color
        originalMaterials.current[nodeName] = node.material.color.clone();

        // Map node name to anatomical part if it contains it
        Object.keys(NODE_DISPLAY_NAMES).forEach((anatomicalPart) => {
          if (nodeName.toLowerCase().includes(anatomicalPart.toLowerCase())) {
            if (!partsMap.current[anatomicalPart]) {
              partsMap.current[anatomicalPart] = [];
            }
            partsMap.current[anatomicalPart].push(nodeName);
          }
        });
      }
    });

    setIsModelProcessed(true);
  }, [nodes]);

  // Update highlighted parts when selection changes
  useEffect(() => {
    if (!isModelProcessed || !nodes) return;

    // Reset all materials to original
    Object.keys(originalMaterials.current).forEach((nodeName) => {
      if (nodes[nodeName] && nodes[nodeName].material) {
        nodes[nodeName].material.color.copy(
          originalMaterials.current[nodeName]
        );
        nodes[nodeName].material.transparent = false;
        nodes[nodeName].material.opacity = 1.0;
      }
    });

    // Highlight selected parts
    if (highlightedParts.length > 0) {
      highlightedParts.forEach((partName) => {
        if (partsMap.current[partName]) {
          partsMap.current[partName].forEach((nodeName) => {
            if (nodes[nodeName] && nodes[nodeName].material) {
              nodes[nodeName].material.color.set(highlightColor || 0xff0000);
              nodes[nodeName].material.transparent = true;
              nodes[nodeName].material.opacity = 0.8;
            }
          });
        }
      });
    }
  }, [highlightedParts, nodes, isModelProcessed, highlightColor]);

  // Gentle breathing animation
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  if (!nodes) return null;

  return (
    <group ref={group} dispose={null}>
      {Object.keys(nodes).map((nodeName) => {
        const node = nodes[nodeName];
        if (node.isMesh) {
          return (
            <mesh
              key={nodeName}
              geometry={node.geometry}
              material={node.material}
              position={node.position}
              rotation={node.rotation}
              scale={node.scale}
              onPointerOver={() => {
                // Find the anatomical part this node belongs to
                const anatomicalPart = Object.keys(partsMap.current).find(
                  (part) => partsMap.current[part].includes(nodeName)
                );
                setHovered(
                  anatomicalPart ? NODE_DISPLAY_NAMES[anatomicalPart] : nodeName
                );
              }}
              onPointerOut={() => setHovered(null)}
            />
          );
        }
        return null;
      })}
      {hovered && (
        <Html position={[0, 1.5, 0]}>
          <div className="bg-black text-white px-2 py-1 rounded text-sm">
            {hovered}
          </div>
        </Html>
      )}
    </group>
  );
}

const HealthVisualizationApp = () => {
  const [selectedCondition, setSelectedCondition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState(false);
  const modelUrl = "/model/3d-vh-m-united.glb";
  const navigate = useNavigate();

  const condition = selectedCondition
    ? MEDICAL_CONDITIONS.find((c) => c.id === selectedCondition)
    : null;

  const highlightedParts = condition?.affectedParts || [];
  const highlightColor = condition?.color || "#ff0000";

  useEffect(() => {
    try {
      useGLTF.preload(modelUrl);
    } catch (error) {
      console.error("Error preloading model:", error);
      setModelLoadError(true);
    }
    const timer = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(timer);
  }, [modelUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                size="icon"
                className="hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-semibold text-gray-800">
                Health Visualization
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 px-4 max-w-7xl mx-auto">
        {/* Conditions Carousel */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            Select a Condition
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {MEDICAL_CONDITIONS.map((condition) => (
              <Card
                key={condition.id}
                className={`flex-shrink-0 w-[280px] cursor-pointer transition-all snap-start hover:shadow-md
                  ${
                    selectedCondition === condition.id
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : ""
                  }
                `}
                onClick={() => setSelectedCondition(condition.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: condition.color }}
                    />
                    <h3 className="font-semibold text-gray-800">
                      {condition.name}
                    </h3>
                  </div>
                  <Badge
                    variant={
                      condition.severity === "Severe"
                        ? "destructive"
                        : condition.severity === "Moderate"
                        ? "warning"
                        : "default"
                    }
                    className="mb-2"
                  >
                    {condition.severity}
                  </Badge>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {condition.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 3D Visualization Container */}
        <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden h-[600px] mb-8">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50 backdrop-blur-sm">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-lg font-medium text-gray-700">
                  Loading 3D Human Model...
                </span>
              </div>
            </div>
          )}

          {modelLoadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50 backdrop-blur-sm">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-md">
                <div className="flex items-center text-red-500 mb-4">
                  <AlertCircle className="h-6 w-6 mr-3" />
                  <h3 className="text-xl font-semibold">Model Loading Error</h3>
                </div>
                <p className="mb-4 text-gray-700">
                  Unable to load the 3D human model. A simplified model will be
                  shown instead.
                </p>
                <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-2">
                  <li>Invalid model path or file not found</li>
                  <li>Network connectivity issues</li>
                  <li>Unsupported model format</li>
                </ul>
                <p className="text-sm text-gray-500">
                  Please check the model URL and ensure it's accessible.
                </p>
              </div>
            </div>
          )}

          <Canvas
            camera={{ position: [0, 1.2, 2.5], fov: 50 }}
            shadows
            className="w-full h-full"
          >
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.5}>
                <ModelErrorBoundary
                  fallback={
                    <Center>
                      <FallbackHumanModel
                        highlightedParts={highlightedParts}
                        highlightColor={highlightColor}
                      />
                    </Center>
                  }
                >
                  <HumanModel
                    highlightedParts={highlightedParts}
                    modelUrl={modelUrl}
                    highlightColor={highlightColor}
                  />
                </ModelErrorBoundary>
              </Stage>
              <OrbitControls
                enableZoom={true}
                enablePan={true}
                minPolarAngle={Math.PI / 6}
                maxPolarAngle={Math.PI * 0.8}
                minDistance={1.5}
                maxDistance={4}
                enableDamping={true}
                dampingFactor={0.05}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Condition Information */}
        {selectedCondition && (
          <Alert className="mb-8 bg-white shadow-md">
            <Info className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-base text-gray-700">
              {condition?.description}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50 backdrop-blur-sm">
    <div className="flex flex-col items-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <span className="text-lg font-medium text-gray-700">
        Loading 3D Human Model...
      </span>
    </div>
  </div>
);

const ModelErrorMessage = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-50 backdrop-blur-sm">
    <div className="bg-white p-8 rounded-xl shadow-xl max-w-md">
      <div className="flex items-center text-red-500 mb-4">
        <AlertCircle className="h-6 w-6 mr-3" />
        <h3 className="text-xl font-semibold">Model Loading Error</h3>
      </div>
      <p className="mb-4 text-gray-700">
        Unable to load the 3D human model. A simplified model will be shown
        instead.
      </p>
      <ul className="list-disc pl-5 mb-4 text-sm text-gray-600 space-y-2">
        <li>Invalid model path or file not found</li>
        <li>Network connectivity issues</li>
        <li>Unsupported model format</li>
      </ul>
      <p className="text-sm text-gray-500">
        Please check the model URL and ensure it's accessible.
      </p>
    </div>
  </div>
);

export default HealthVisualizationApp;
