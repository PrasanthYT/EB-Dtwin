import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, MailIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function Settings() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    email: "",
    name: "",
    profilePicture: "/api/placeholder/150/150",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    void fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsFetching(true);
      const token = sessionStorage.getItem("token");
      
      if (!token) {
        navigate("/signin");
        return;
      }

      const response = await fetch("http://localhost:4200/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { user } = await response.json();
      setUserData({
        email: user.username || "",
        name: user.name || "",
        profilePicture: user.userDetails.avatar || "/api/placeholder/150/150",
      });
    } catch (error) {
      toast.error("Failed to fetch user data. Please try again later.");
      console.error("Error fetching user data:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!userData.name.trim()) {
      toast.error("Name field cannot be empty");
      return;
    }

    setIsLoading(true);
    try {
      const token = sessionStorage.getItem("token");
      
      if (!token) {
        navigate("/signin");
        return;
      }

      const response = await fetch(
        "http://localhost:4200/api/auth/update-profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success("Profile updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to update profile. Please try again later.");
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <Card className="mx-auto max-w-md">
        <CardHeader className="relative h-36 overflow-hidden rounded-t-lg bg-[#1a1f37] p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 to-transparent" />
          <div className="relative flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
            <h1 className="text-xl font-semibold text-white">Profile Setup</h1>
          </div>
        </CardHeader>

        <div className="relative -mt-14 flex justify-center">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg">
            <img
              src={userData.profilePicture}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <CardContent className="space-y-6 p-6 pt-20">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  value={userData.email}
                  disabled
                  className="pl-10 bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  value={userData.name}
                  onChange={(e) =>
                    setUserData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="pl-10"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="w-full gap-2 bg-blue-600 py-6 text-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Updating..." : "Save"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}