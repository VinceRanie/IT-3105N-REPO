"use client"
import Image from "next/image"
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Collections() {
    const collections = [
      {
        id: 1,
        title: "Bacterial Cultures",
        description: "Comprehensive collection of beneficial and pathogenic bacterial strains for research and analysis.",
        specimens: 1250,
        category: "Bacteria",
        image: "/UI/img/Laboratory.jpg",
        color: "blue",
      },
      {
        id: 2,
        title: "Fungal Specimens",
        description: "Diverse fungi collection including yeasts, molds, and medicinal mushroom cultures.",
        specimens: 890,
        category: "Fungi",
        image: "/UI/img/Laboratory.jpg",
        color: "green",
      },
      {
        id: 3,
        title: "Marine Microbes",
        description: "Unique collection of marine microorganisms from various oceanic environments.",
        specimens: 650,
        category: "Marine",
        image: "/UI/img/Laboratory.jpg",
        color: "cyan",
      },
      {
        id: 4,
        title: "Soil Microbiome",
        description: "Extensive soil-derived microbial cultures from different geographical regions.",
        specimens: 980,
        category: "Environmental",
        image: "/UI/img/Laboratory.jpg",
        color: "amber",
      },
      {
        id: 5,
        title: "Probiotic Strains",
        description: "Carefully curated collection of beneficial microorganisms for health applications.",
        specimens: 420,
        category: "Health",
        image: "/UI/img/Laboratory.jpg",
        color: "purple",
      },
      {
        id: 6,
        title: "Extremophiles",
        description: "Rare microorganisms that thrive in extreme conditions like high temperature or acidity.",
        specimens: 320,
        category: "Specialized",
        image: "/UI/img/Laboratory.jpg",
        color: "red",
      },
    ]
  
    const getColorClasses = (color: string) => {
      const colorMap = {
        blue: "bg-blue-500 text-blue-600 border-blue-200",
        green: "bg-green-500 text-green-600 border-green-200",
        cyan: "bg-cyan-500 text-cyan-600 border-cyan-200",
        amber: "bg-amber-500 text-amber-600 border-amber-200",
        purple: "bg-purple-500 text-purple-600 border-purple-200",
        red: "bg-red-500 text-red-600 border-red-200",
      }
      return colorMap[color as keyof typeof colorMap] || colorMap.blue
    }
    const router = useRouter();
  
    return (
      <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
      viewport={{ once: false }}
      id="collection"
       className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#113F67] mb-4">Our Collections</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our extensive repository of microorganisms, carefully preserved and catalogued for research and
              discovery.
            </p>
            <div className="w-24 h-1 bg-[#113F67] mx-auto rounded-full mt-6"></div>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => {
              const colorClasses = getColorClasses(collection.color)
              return (
                <div
                  key={collection.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                <div className="relative">
                  <Image
                      src={collection.image || "/placeholder.svg"}
                      alt={collection.title}
                      className="object-cover rounded-t-2xl"
                       width={600} 
                       height={400}
                       priority={collection.id === 1} 
                      />
                    <div
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 ${colorClasses.split(" ")[1]}`}
                     >
                      {collection.category}
                     </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#113F67] mb-2">{collection.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">{collection.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colorClasses.split(" ")[0]}`}></div>
                        <span className="text-sm font-medium text-gray-700">
                          {collection.specimens.toLocaleString()} specimens
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
  
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-[#113F67] mb-2">4,510+</div>
                <div className="text-gray-600">Total Specimens</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#113F67] mb-2">6</div>
                <div className="text-gray-600">Collection Categories</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#113F67] mb-2">25+</div>
                <div className="text-gray-600">Locale</div>
              </div>
            </div>
          </div>
  
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">Set an Appointment to our Laboratory.</p>
            <button onClick={() => router.push("/Appointment")} className="bg-[#113F67] text-white px-8 py-3 rounded-lg font-large capitalize hover:shadow-2xl cursor-pointer">
             Request an Appointment
            </button>
          </div>
        </div>
      </motion.section>
    )
  }
  