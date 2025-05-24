import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Search, X, Check } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";

const MEDICATIONS_DATABASE = [
  { name: "Abilify", category: "Antipsychotic" },
  { name: "Acetaminophen", category: "Pain Reliever" },
  { name: "Actos", category: "Diabetes Medication" },
  { name: "Adderall", category: "ADHD Medication" },
  { name: "Advair", category: "Asthma Medication" },
  { name: "Albuterol", category: "Bronchodilator" },
  { name: "Allegra", category: "Antihistamine" },
  { name: "Ambien", category: "Sleep Aid" },
  { name: "Amitriptyline", category: "Antidepressant" },
  { name: "Amlodipine", category: "Blood Pressure Medication" },
  { name: "Amoxicillin", category: "Antibiotic" },
  { name: "Atenolol", category: "Beta Blocker" },
  { name: "Ativan", category: "Anti-Anxiety" },
  { name: "Atorvastatin", category: "Cholesterol Medication" },
  { name: "Augmentin", category: "Antibiotic" },
  { name: "Azithromycin", category: "Antibiotic" },
  { name: "Bactrim", category: "Antibiotic" },
  { name: "Benadryl", category: "Antihistamine" },
  { name: "Bisoprolol", category: "Beta Blocker" },
  { name: "Buspirone", category: "Anti-Anxiety" },
  { name: "Celebrex", category: "Pain Reliever" },
  { name: "Celexa", category: "Antidepressant" },
  { name: "Cetirizine", category: "Antihistamine" },
  { name: "Cialis", category: "ED Medication" },
  { name: "Cipro", category: "Antibiotic" },
  { name: "Citalopram", category: "Antidepressant" },
  { name: "Claritin", category: "Antihistamine" },
  { name: "Clindamycin", category: "Antibiotic" },
  { name: "Clonazepam", category: "Anti-Anxiety" },
  { name: "Clopidogrel", category: "Blood Thinner" },
  { name: "Codeine", category: "Pain Reliever" },
  { name: "Concerta", category: "ADHD Medication" },
  { name: "Coreg", category: "Beta Blocker" },
  { name: "Coumadin", category: "Blood Thinner" },
  { name: "Crestor", category: "Cholesterol Medication" },
  { name: "Cyclobenzaprine", category: "Muscle Relaxant" },
  { name: "Cymbalta", category: "Antidepressant" },
  { name: "Dexamethasone", category: "Corticosteroid" },
  { name: "Diazepam", category: "Anti-Anxiety" },
  { name: "Diclofenac", category: "Pain Reliever" },
  { name: "Digoxin", category: "Heart Medication" },
  { name: "Diltiazem", category: "Blood Pressure Medication" },
  { name: "Doxycycline", category: "Antibiotic" },
  { name: "Duloxetine", category: "Antidepressant" },
  { name: "Effexor", category: "Antidepressant" },
  { name: "Eliquis", category: "Blood Thinner" },
  { name: "Escitalopram", category: "Antidepressant" },
  { name: "Esomeprazole", category: "Acid Reducer" },
  { name: "Estradiol", category: "Hormone Therapy" },
  { name: "Famotidine", category: "Acid Reducer" },
  { name: "Felodipine", category: "Blood Pressure Medication" },
  { name: "Fentanyl", category: "Pain Reliever" },
  { name: "Fluoxetine", category: "Antidepressant" },
  { name: "Fluticasone", category: "Nasal Steroid" },
  { name: "Furosemide", category: "Diuretic" },
  { name: "Gabapentin", category: "Anticonvulsant" },
  { name: "Gemfibrozil", category: "Cholesterol Medication" },
  { name: "Glipizide", category: "Diabetes Medication" },
  { name: "Hydrochlorothiazide", category: "Diuretic" },
  { name: "Hydroxyzine", category: "Anti-Anxiety" },
  { name: "Ibuprofen", category: "Pain Reliever" },
  { name: "Insulin", category: "Diabetes Medication" },
  { name: "Januvia", category: "Diabetes Medication" },
  { name: "Jardiance", category: "Diabetes Medication" },
  { name: "Ketamine", category: "Anesthetic" },
  { name: "Ketoconazole", category: "Antifungal" },
  { name: "Labetalol", category: "Blood Pressure Medication" },
  { name: "Lamictal", category: "Anticonvulsant" },
  { name: "Lansoprazole", category: "Acid Reducer" },
  { name: "Levothyroxine", category: "Thyroid Medication" },
  { name: "Lexapro", category: "Antidepressant" },
  { name: "Lisinopril", category: "Blood Pressure Medication" },
  { name: "Lomotil", category: "Anti-Diarrheal" },
  { name: "Loratadine", category: "Antihistamine" },
  { name: "Lorazepam", category: "Anti-Anxiety" },
  { name: "Losartan", category: "Blood Pressure Medication" },
  { name: "Lyrica", category: "Anticonvulsant" },
  { name: "Meloxicam", category: "Pain Reliever" },
  { name: "Metformin", category: "Diabetes Medication" },
  { name: "Metoprolol", category: "Beta Blocker" },
  { name: "Metronidazole", category: "Antibiotic" },
  { name: "Mirtazapine", category: "Antidepressant" },
  { name: "Montelukast", category: "Asthma Medication" },
  { name: "Morphine", category: "Pain Reliever" },
  { name: "Naproxen", category: "Pain Reliever" },
  { name: "Nexium", category: "Acid Reducer" },
  { name: "Nifedipine", category: "Blood Pressure Medication" },
  { name: "Nitrofurantoin", category: "Antibiotic" },
  { name: "Norvasc", category: "Blood Pressure Medication" },
  { name: "Omeprazole", category: "Acid Reducer" },
  { name: "Ondansetron", category: "Anti-Nausea" },
  { name: "Oxycodone", category: "Pain Reliever" },
  { name: "Pantoprazole", category: "Acid Reducer" },
  { name: "Paroxetine", category: "Antidepressant" },
  { name: "Penicillin", category: "Antibiotic" },
  { name: "Phenytoin", category: "Anticonvulsant" },
  { name: "Prednisone", category: "Corticosteroid" },
  { name: "Pregabalin", category: "Anticonvulsant" },
  { name: "Propranolol", category: "Beta Blocker" },
  { name: "Quetiapine", category: "Antipsychotic" },
  { name: "Ramipril", category: "Blood Pressure Medication" },
  { name: "Ranitidine", category: "Acid Reducer" },
  { name: "Ritalin", category: "ADHD Medication" },
  { name: "Rosuvastatin", category: "Cholesterol Medication" },
  { name: "Sertraline", category: "Antidepressant" },
  { name: "Simvastatin", category: "Cholesterol Medication" },
  { name: "Spironolactone", category: "Diuretic" },
  { name: "Tamsulosin", category: "Prostate Medication" },
  { name: "Telmisartan", category: "Blood Pressure Medication" },
  { name: "Temazepam", category: "Sleep Aid" },
  { name: "Tetracycline", category: "Antibiotic" },
  { name: "Topiramate", category: "Anticonvulsant" },
  { name: "Tramadol", category: "Pain Reliever" },
  { name: "Trazodone", category: "Antidepressant" },
  { name: "Triamterene", category: "Diuretic" },
  { name: "Valacyclovir", category: "Antiviral" },
  { name: "Valsartan", category: "Blood Pressure Medication" },
  { name: "Venlafaxine", category: "Antidepressant" },
  { name: "Verapamil", category: "Blood Pressure Medication" },
  { name: "Viagra", category: "ED Medication" },
  { name: "Warfarin", category: "Blood Thinner" },
  { name: "Xanax", category: "Anti-Anxiety" },
  { name: "Zoloft", category: "Antidepressant" },
  { name: "Zolpidem", category: "Sleep Aid" },
  { name: "Zyrtec", category: "Antihistamine" }
];

export default function ScrollableMedicationSelection({
  nextStep,
  prevStep,
  setUserData,
}) {
  const [medications, setMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedications, setSelectedMedications] = useState([]);
  const [alphabetFilter, setAlphabetFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const alphabetButtons = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    filterMedications();
  }, [alphabetFilter, page, searchTerm]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  const filterMedications = () => {
    setLoading(true);
    const filteredMeds = MEDICATIONS_DATABASE.filter(med => {
      const matchesSearch = !searchTerm || 
        med.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLetter = !alphabetFilter || 
        med.name.toLowerCase().startsWith(alphabetFilter.toLowerCase());
      return matchesSearch && matchesLetter;
    });

    const paginatedMeds = filteredMeds.slice(0, page * ITEMS_PER_PAGE);
    setMedications(paginatedMeds);
    setHasMore(paginatedMeds.length < filteredMeds.length);
    setLoading(false);
  };

  const handleNext = () => {
    setUserData(prev => ({ ...prev, medications: selectedMedications }));
    nextStep();
  };

  const toggleMedication = (medication) => {
    setSelectedMedications(prev =>
      prev.some(m => m.name === medication.name)
        ? prev.filter(m => m.name !== medication.name)
        : [...prev, medication]
    );
  };

  const removeSelectedMedication = (medication) => {
    setSelectedMedications(prev =>
      prev.filter(m => m.name !== medication.name)
    );
  };

  return (
    <div className="h-screen bg-white flex flex-col max-w-md mx-auto p-4">
      {/* Fixed Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-gray-200"
            onClick={prevStep}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Progress value={88.88} className="h-2 w-32" />
          <Button variant="ghost" className="text-sm text-gray-600">
            Skip
          </Button>
        </div>

        <h1 className="text-2xl font-semibold">What medications do you take?</h1>

        <div className="w-full overflow-x-auto">
          <div className="flex space-x-2 pb-2">
            {alphabetButtons.map((letter) => (
              <button
                key={letter}
                onClick={() => {
                  setAlphabetFilter(letter === alphabetFilter ? "" : letter);
                  setMedications([]);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors 
                  ${alphabetFilter === letter
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search medications"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
              setMedications([]);
            }}
            className="w-full p-2 pl-10 border rounded-lg focus:outline-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setMedications([]);
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto my-4 space-y-2">
        {medications.map((medication) => (
          <div
            key={medication.name}
            onClick={() => toggleMedication(medication)}
            className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors 
              ${selectedMedications.some(m => m.name === medication.name)
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-50 hover:bg-gray-100"
              }`}
          >
            <div>
              <div className="font-medium">{medication.name}</div>
              <div className="text-xs text-gray-500">{medication.category}</div>
            </div>
            {selectedMedications.some(m => m.name === medication.name) && (
              <Check className="h-5 w-5 text-blue-600" />
            )}
          </div>
        ))}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-16 rounded-lg"/>
              ))}
            </div>
          </div>
        )}
        <div ref={observerTarget} className="h-4" />
      </div>

      {/* Fixed Footer Section */}
      <div className="space-y-4">
        {selectedMedications.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {selectedMedications.map((medication) => (
                <Badge
                  key={medication.name}
                  variant="secondary"
                  className="flex items-center"
                >
                  {medication.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedMedication(medication);
                    }}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <button
          className="w-full bg-[#0066FF] text-white rounded-xl py-4 flex items-center justify-center gap-2 text-[16px] font-medium"
          onClick={handleNext}
        >
          Continue
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}