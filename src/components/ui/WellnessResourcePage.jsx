import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  BookOpen,
  Video,
  Clock,
  Users,
  ExternalLink,
  Bookmark,
  Star,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";


const WellnessResourcePage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Simulated API call using Lorem Picsum for images
  useEffect(() => {
    const fetchResources = async () => {
      try {
        // Fetch random articles for demo
        const response = await fetch(
          "https://api.spaceflightnewsapi.net/v4/articles?limit=6"
        );
        const data = await response.json();

        // Transform the API data into our resource format
        const transformedData = data.results.map((item, index) => ({
          id: item.id,
          title:
            item.title.slice(0, 60) + (item.title.length > 60 ? "..." : ""),
          type: ["Course", "Workshop", "Video Series"][index % 3],
          duration: ["4 weeks", "6 sessions", "3 hours"][index % 3],
          instructor: ["Dr. Sarah Chen", "Mike Thompson", "Dr. Emma Roberts"][
            index % 3
          ],
          enrolled: Math.floor(Math.random() * 2000) + 500,
          rating: (Math.random() * (5 - 4) + 4).toFixed(1),
          image: `/api/placeholder/${400}/${250}`,
          category: [
            "Mental Health",
            "Nutrition",
            "Physical Fitness",
            "Meditation",
          ][index % 4],
          level: ["Beginner", "Intermediate", "Advanced"][index % 3],
          summary: item.summary.slice(0, 100) + "...",
          publishedAt: new Date(item.published_at).toLocaleDateString(),
        }));

        setResources(transformedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching resources:", error);
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const categories = [
    { id: 1, name: "Mental Health", icon: "🧠", count: 45 },
    { id: 2, name: "Physical Fitness", icon: "💪", count: 38 },
    { id: 3, name: "Nutrition", icon: "🥗", count: 32 },
    { id: 4, name: "Meditation", icon: "🧘‍♀️", count: 28 },
    { id: 5, name: "Sleep", icon: "😴", count: 24 },
    { id: 6, name: "Stress Management", icon: "🌿", count: 30 },
  ];

  const quickGuides = [
    {
      id: 1,
      title: "5-Minute Meditation Guide",
      category: "Meditation",
      readTime: "5 min",
      icon: "🧘‍♀️",
      new: true,
    },
    {
      id: 2,
      title: "Healthy Meal Planning 101",
      category: "Nutrition",
      readTime: "8 min",
      icon: "🥗",
    },
    {
      id: 3,
      title: "Desk Exercises at Work",
      category: "Physical Fitness",
      readTime: "6 min",
      icon: "💪",
    },
    {
      id: 4,
      title: "Stress Relief Techniques",
      category: "Mental Health",
      readTime: "7 min",
      icon: "🧠",
    },
  ];

  return (
    <div className="bg-orange-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-400 to-yellow-500 p-4 pb-8 text-white">
        <div className="flex items-center mb-6">
          <Link to="/healthsuggestion">
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <div className="ml-2">
            <p className="text-orange-100 text-sm font-medium tracking-wider uppercase">
              Wellness Journey
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Resource Library
            </h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search resources, courses, and guides..."
            className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-orange-100 border border-white/20 rounded-xl px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-100" />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 md:px-6 -mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-white"
            >
              <CardContent className="p-4 text-center">
                <span className="text-3xl mb-2 block">{category.icon}</span>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  {category.count} resources
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Featured Resources */}
      <div className="p-4 md:p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Featured Resources
          </h2>
          <button className="flex items-center space-x-2 text-orange-600 hover:text-orange-700">
            <Filter size={16} />
            <span className="text-sm font-medium">Filter</span>
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card
                key={resource.id}
                className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className="relative aspect-video bg-gray-100">
                  <img
                    src={resource.image}
                    alt={resource.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium text-orange-600">
                    {resource.type}
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      {resource.category}
                    </span>
                    <span className="flex items-center text-sm text-gray-500">
                      <Star
                        className="w-4 h-4 text-yellow-400 mr-1"
                        fill="currentColor"
                      />
                      {resource.rating}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {resource.summary}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {resource.duration}
                    </span>
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {resource.enrolled.toLocaleString()} enrolled
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Guides */}
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-bold mb-6 text-gray-900">Quick Guides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickGuides.map((guide) => (
            <Card
              key={guide.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white"
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 p-3 rounded-xl group-hover:scale-110 transition-transform">
                    <span className="text-2xl">{guide.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {guide.title}
                      </h3>
                      {guide.new && (
                        <span className="bg-yellow-400 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-600">
                        {guide.category}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {guide.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WellnessResourcePage;
