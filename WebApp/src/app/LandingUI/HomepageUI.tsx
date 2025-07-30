import Navbar from "../UI Components/Nav";
import Form from "../Login/Form";
import AboutUs from "../UI Components/About";
import Collections from "../UI Components/Collection";
import Features from "../UI Components/Features";
import Footer from "../UI Components/Footer";

export default function Homepage(){
return(
    <>
     <Navbar/>
     {/* <div>
        <h1>
        BIOCELLA    
        </h1>
        <div>
        <p>Welcome University of San Carlos Students!</p>
        <p>Sign in to explore exclusive BIOCELLA features</p>
        <button>
        LOGIN
        </button> 
        </div>
         <div>
            
         </div>
        </div> */}
        <Form/>
        <AboutUs/>
        <Collections/>
        <Features/>
        <Footer/>
    </>
   
)

}
