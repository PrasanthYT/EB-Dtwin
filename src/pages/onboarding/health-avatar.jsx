import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const AVATAR_API = "https://api.dicebear.com/7.x/lorelei/svg?seed=";

export default function AvatarSelector({
  setUserData,
  submitAvatar,
}) {
  const [avatars, setAvatars] = useState(["", "", ""]);
  const [selectedAvatar, setSelectedAvatar] = useState(""); // Store selected avatar
  const [loading, setLoading] = useState(true);
  console.log(selectedAvatar);
  const fetchAvatars = () => {
    setLoading(true);
    const newAvatars = Array(3)
      .fill(0)
      .map(() => `${AVATAR_API}${Math.random().toString(36).substring(7)}`);

    setAvatars(newAvatars);

    setTimeout(() => {
      setSelectedAvatar(newAvatars[1]); // ✅ Ensure selectedAvatar is set correctly
    }, 50);

    setLoading(false);
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleNext = () => {
    setAvatars((prev) => [
      prev[1],
      prev[2],
      `${AVATAR_API}${Math.random().toString(36).substring(7)}`,
    ]);
    setSelectedAvatar(avatars[2]); // Update selected avatar
  };

  const handlePrev = () => {
    setAvatars((prev) => [
      `${AVATAR_API}${Math.random().toString(36).substring(7)}`,
      prev[0],
      prev[1],
    ]);
    setSelectedAvatar(avatars[0]); // Update selected avatar
  };

  const handleSubmit = () => {
    if (!selectedAvatar) {
      console.error("No avatar selected!");
      return;
    }

    // ✅ First, update userData state with the selected avatar
    setUserData((prev) => ({ ...prev, avatar: selectedAvatar }));

    // ✅ Wait for the state to update, then submit
    setTimeout(() => {
      submitAvatar(selectedAvatar); // ✅ Pass selectedAvatar directly
    }, 100); // Small delay to ensure state is updated
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white h-screen w-full rounded-2xl shadow-lg border border-gray-200">
      <div className="w-full flex items-center justify-start gap-x-3 max-w-md">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-gray-200"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Select Avatar</h2>
      </div>
      <div className="relative flex items-center justify-center mt-6 w-full max-w-xs">
        {/* Previous Avatar (Faded) */}
        <motion.img
          onClick={handlePrev}
          src={avatars[0]}
          alt="Previous Avatar"
          className="absolute left-0 w-24 h-24 rounded-full opacity-40 cursor-pointer"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 0.4, x: 0 }}
          transition={{ duration: 0.5 }}
        />
        {/* Current Avatar */}
        <motion.div
          key={avatars[1]}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-40 h-40 flex justify-center items-center border-2 border-blue-500 rounded-full bg-white shadow-md">
            <CardContent className="p-0">
              {loading ? (
                <div className="w-full h-full animate-pulse bg-gray-300 rounded-full"></div>
              ) : (
                <img
                  src={selectedAvatar}
                  alt="Avatar"
                  className="w-full h-full rounded-full"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
        {/* Next Avatar (Faded) */}
        <motion.img
          onClick={handleNext}
          src={avatars[2]}
          alt="Next Avatar"
          className="absolute right-0 w-24 h-24 rounded-full opacity-40 cursor-pointer"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 0.4, x: 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <h3 className="text-md font-semibold text-gray-800 mt-4">
        Select Avatar 🎉
      </h3>
      <p className="text-gray-500 text-center text-sm mt-1 px-6">
        We have 25 premade avatars for your convenience. Kindly choose one of
        them!
      </p>
      <div className="flex gap-4 mt-6 h-2/6"></div>
      <Button
        onClick={fetchAvatars}
        className="w-full mt-5 px-10 py-6 text-base font-medium bg-blue-600 hover:bg-blue-700"
      >
        Random Wish ✨
      </Button>
      <Link to="/dashboard">
        <Button
          onClick={handleSubmit}
          className="w-full mt-5 px-10 py-6 text-base font-medium bg-blue-600 hover:bg-blue-700"
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}
