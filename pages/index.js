import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`bg-white flex min-h-screen  p-24 ${inter.className}`}
    >
     
say hi to <a className="ml-2 underline" target="_blank" href="https://telegram.me/BoatInTheSky">mayur</a>

    </main>
  );
}
