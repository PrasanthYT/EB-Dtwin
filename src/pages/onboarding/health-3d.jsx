import React, { Suspense, useState, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Stage, Html, Center } from "@react-three/drei";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Activity, ArrowLeft } from "lucide-react";

// Enhanced medical conditions mapping with precise camera positions for focused zoom
const DISEASE_MAPPING = {
  diabetes: {
    name: "Diabetes",
    affectedParts: ["pancreas"],
    description: "Affects the pancreas and blood sugar regulation throughout the body",
    severity: "Severe",
    color: "#ff6b35",
    cameraPosition: [0.3, -0.3, 0.8],
    cameraTarget: [0, -0.3, 0],
    zoomLevel: 4
  },
  "heart attack": {
    name: "Heart Attack",
    affectedParts: ["heart"],
    description: "Affects the heart muscle and blood flow, potentially life-threatening",
    severity: "Critical",
    color: "#dc2626",
    cameraPosition: [0.4, 0.3, 0.9],
    cameraTarget: [-0.15, 0.2, 0],
    zoomLevel: 4.5
  },
  "blood pressure": {
    name: "High Blood Pressure",
    affectedParts: ["heart", "blood vasculature", "vascular system"],
    description: "Affects the cardiovascular system and can lead to serious complications",
    severity: "Severe",
    color: "#b91c1c",
    cameraPosition: [0.6, 0.2, 1.1],
    cameraTarget: [0, 0.1, 0],
    zoomLevel: 3.5
  },
  lungs: {
    name: "Lung Disease",
    affectedParts: ["respiratory system", "extrapulmonary bronchus", "main bronchus", "trachea"],
    description: "Affects the respiratory system including airways and lung tissue",
    severity: "Severe",
    color: "#2563eb",
    cameraPosition: [0.5, 0.8, 1.0],
    cameraTarget: [0, 0.6, 0],
    zoomLevel: 4
  },
  "cardiovascular disease": {
    name: "Cardiovascular Disease",
    affectedParts: ["heart", "vascular system", "blood vasculature"],
    description: "Affects the heart and blood vessels, including coronary artery disease",
    severity: "Severe",
    color: "#dc2626",
    cameraPosition: [0.6, 0.2, 1.1],
    cameraTarget: [0, 0.1, 0],
    zoomLevel: 3.5
  },
  "respiratory condition": {
    name: "Respiratory Condition",
    affectedParts: ["respiratory system", "extrapulmonary bronchus", "main bronchus", "trachea"],
    description: "Condition affecting the lungs and airways, such as asthma or COPD",
    severity: "Moderate",
    color: "#2563eb",
    cameraPosition: [0.5, 0.8, 1.0],
    cameraTarget: [0, 0.6, 0],
    zoomLevel: 4
  },
  "digestive system issue": {
    name: "Digestive System Issue",
    affectedParts: ["small intestine", "large intestine", "liver", "pancreas"],
    description: "Affects the digestive tract, including conditions like IBS or Crohn's disease",
    severity: "Mild",
    color: "#16a34a",
    cameraPosition: [0.7, -0.2, 1.2],
    cameraTarget: [0, -0.4, 0],
    zoomLevel: 3.5
  },
  "neurological condition": {
    name: "Neurological Condition",
    affectedParts: ["brain", "spinal cord"],
    description: "Affects the central nervous system, including conditions like MS or epilepsy",
    severity: "Severe",
    color: "#7c3aed",
    cameraPosition: [0.3, 1.4, 0.8],
    cameraTarget: [0, 1.2, 0],
    zoomLevel: 5
  },
  "knee injury": {
    name: "Knee Injury",
    affectedParts: ["left knee", "right knee"],
    description: "Injury or degenerative condition affecting one or both knees",
    severity: "Moderate",
    color: "#ea580c",
    cameraPosition: [0.6, -1.5, 1.3],
    cameraTarget: [0, -1.5, 0],
    zoomLevel: 4.5
  }
};

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
function FallbackHumanModel({ partHighlights }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  // Function to get color for a body part
  const getPartColor = (partName) => {
    const highlight = partHighlights.find(h => h.parts.includes(partName));
    return highlight ? highlight.color : "#b0c4de";
  };

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.3, 1.5, 16]} />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={getPartColor("brain")} />
      </mesh>

      {/* Arms */}
      <mesh position={[0.7, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>
      <mesh position={[-0.7, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
        <meshStandardMaterial color="#b0c4de" />
      </mesh>

      {/* Legs */}
      <mesh position={[0.25, -1.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
        <meshStandardMaterial color={getPartColor("right knee")} />
      </mesh>
      <mesh position={[-0.25, -1.1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
        <meshStandardMaterial color={getPartColor("left knee")} />
      </mesh>

      {/* Heart area */}
      <mesh position={[-0.15, 0.3, 0.2]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={getPartColor("heart")} />
      </mesh>

      {/* Pancreas area */}
      <mesh position={[0.1, -0.2, 0.1]}>
        <boxGeometry args={[0.15, 0.08, 0.12]} />
        <meshStandardMaterial color={getPartColor("pancreas")} />
      </mesh>

      {/* Lungs area */}
      <mesh position={[0.2, 0.5, 0.1]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial 
          color={partHighlights.some(h => h.parts.some(p => p.includes("bronchus") || p.includes("respiratory"))) 
            ? partHighlights.find(h => h.parts.some(p => p.includes("bronchus") || p.includes("respiratory")))?.color || "#87ceeb"
            : "#87ceeb"
          } 
        />
      </mesh>
      <mesh position={[-0.2, 0.5, 0.1]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial 
          color={partHighlights.some(h => h.parts.some(p => p.includes("bronchus") || p.includes("respiratory"))) 
            ? partHighlights.find(h => h.parts.some(p => p.includes("bronchus") || p.includes("respiratory")))?.color || "#87ceeb"
            : "#87ceeb"
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

function HumanModel({ partHighlights, modelUrl }) {
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
        nodes[nodeName].material.emissive.setHex(0x000000);
      }
    });

    // Highlight selected parts with enhanced visibility
    partHighlights.forEach((highlight) => {
      highlight.parts.forEach((partName) => {
        if (partsMap.current[partName]) {
          partsMap.current[partName].forEach((nodeName) => {
            if (nodes[nodeName] && nodes[nodeName].material) {
              nodes[nodeName].material.color.set(highlight.color);
              nodes[nodeName].material.transparent = true;
              nodes[nodeName].material.opacity = 0.9;
              // Add slight glow effect
              nodes[nodeName].material.emissive.setHex(
                parseInt(highlight.color.replace('#', ''), 16)
              );
              nodes[nodeName].material.emissiveIntensity = 0.1;
            }
          });
        }
      });
    });
  }, [partHighlights, nodes, isModelProcessed]);

  // Gentle breathing animation
  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.01;
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
        <Html position={[0, 2, 0]}>
          <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            {hovered}
          </div>
        </Html>
      )}
    </group>
  );
}

const HealthVisualizationApp = ({ 
  diseases = ["heart attack"], // Now accepts array of disease strings
  title = "Your Body Twin" 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelLoadError, setModelLoadError] = useState(false);
  const modelUrl = "/model/3d-vh-m-united.glb";

  // Process multiple diseases
  const processedDiseases = Array.isArray(diseases) ? diseases : [diseases];
  
  // Get all disease configurations and combine affected parts
  const diseaseConfigs = processedDiseases
    .map(disease => DISEASE_MAPPING[disease.toLowerCase()])
    .filter(Boolean); // Remove undefined entries

  // Create part highlights with disease-specific colors
  const partHighlights = diseaseConfigs.map(config => ({
    disease: config.name,
    parts: config.affectedParts,
    color: config.color,
    severity: config.severity,
    description: config.description
  }));

  // Get all unique affected parts for display
  const allAffectedParts = [...new Set(diseaseConfigs.flatMap(config => config.affectedParts))];

  useEffect(() => {
    try {
      useGLTF.preload(modelUrl);
    } catch (error) {
      console.error("Error preloading model:", error);
      setModelLoadError(true);
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [modelUrl]);

  // Get severity priority for sorting
  const getSeverityPriority = (severity) => {
    const priorities = { 'Critical': 3, 'Severe': 2, 'Moderate': 1, 'Mild': 0 };
    return priorities[severity] || 0;
  };

  // Sort diseases by severity
  const sortedDiseaseConfigs = [...diseaseConfigs].sort((a, b) => 
    getSeverityPriority(b.severity) - getSeverityPriority(a.severity)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Simplified Header with Back Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {/* <Activity className="w-6 h-6 text-blue-600" /> */}
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Horizontal Scrollable Disease Cards */}
        <div className="relative">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Conditions</h2>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            {sortedDiseaseConfigs.map((diseaseConfig, index) => (
              <div key={index} className="flex-shrink-0 w-80">
                <Card className="h-100 bg-white shadow-lg border-0">
                  <CardContent className="p-5">
                    <div className="flex items-start space-x-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${diseaseConfig.color}15` }}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: diseaseConfig.color }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base mb-1">
                          {diseaseConfig.name}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${diseaseConfig.color}20`,
                            color: diseaseConfig.color,
                            border: `1px solid ${diseaseConfig.color}30`
                          }}
                        >
                          {diseaseConfig.severity}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {diseaseConfig.description}
                    </p>
                    
                    <div>
                      <h4 className="text-xs font-medium text-gray-900 mb-2">Affected Areas</h4>
                      <div className="flex flex-wrap gap-1">
                        {diseaseConfig.affectedParts.slice(0, 3).map((part, partIndex) => (
                          <Badge 
                            key={partIndex} 
                            variant="outline"
                            className="text-xs bg-gray-50"
                          >
                            {NODE_DISPLAY_NAMES[part] || part}
                          </Badge>
                        ))}
                        {diseaseConfig.affectedParts.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-gray-50">
                            +{diseaseConfig.affectedParts.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Model Section */}
        <Card className="bg-white shadow-lg border-0">
          <div className="h-[500px] relative rounded-lg overflow-hidden">
            <Canvas 
              camera={{ 
                position: [0, 0, 0.1], 
                fov: 1
              }}
              className="bg-gradient-to-b from-gray-50 to-gray-100"
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <directionalLight position={[-5, -5, -5]} intensity={0.3} />
              
              <OrbitControls 
                enablePan={false}
                enableZoom={false}
                enableRotate={true}
                minPolarAngle={Math.PI * 0.2}
                maxPolarAngle={Math.PI * 0.8}
              />
              
              <Suspense
                fallback={
                  <Html center>
                    <div className="flex flex-col items-center gap-3 text-gray-700 bg-white px-6 py-4 rounded-lg shadow-lg">
                      <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                      <p className="text-sm font-medium">Loading 3D Model...</p>
                    </div>
                  </Html>
                }
              >
                <Stage environment="city" intensity={0.3}>
                  <Center>
                    <ModelErrorBoundary
                      fallback={
                        <FallbackHumanModel partHighlights={partHighlights} />
                      }
                    >
                      <HumanModel
                        modelUrl={modelUrl}
                        partHighlights={partHighlights}
                      />
                    </ModelErrorBoundary>
                  </Center>
                </Stage>
              </Suspense>
            </Canvas>

            {/* Status indicator */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {sortedDiseaseConfigs.slice(0, 3).map((config, index) => (
                    <div 
                      key={index}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {processedDiseases.length} Active
                </span>
              </div>
            </div>

            {/* Parts counter */}
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-white">
                {allAffectedParts.length} Parts Highlighted
              </span>
            </div>
          </div>
        </Card>

        {/* Alert for errors */}
        {modelLoadError && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              Failed to load the 3D model. Showing fallback model.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default HealthVisualizationApp;