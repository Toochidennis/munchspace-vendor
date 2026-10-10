import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
// Imported rather than referenced by path: the build fingerprints the URL, so
// a replaced file shows up at once instead of being served from the image
// optimizer's cache under the old name.
import foodImage from "@/public/images/auth/food.png";
import vendorImage from "@/public/images/auth/vendor.png";

// The Figma frame is 720 × 1024. Everything inside the stage is placed in
// percentages of that frame, and the headline is sized in container units, so
// the composition scales as one piece instead of stretching a flat export.
const FRAME_W = 720;
const FRAME_H = 1024;

const pct = (px: number, of: number) => `${(px / of) * 100}%`;

// Figma reports the images relative to the group they sit in. The food export
// is cut off by the frame's right and bottom edges, so its visible size pins
// the group 435px down the frame.
const GROUP_TOP = 435;

type Layer = {
  src: StaticImageData;
  left: number;
  top: number;
  width: number;
  height: number;
  fit: "cover" | "fill";
  z: number;
};

const LAYERS: Layer[] = [
  // Figma: 543 × 358 turned -90°, so 358 × 543 on the frame, of which the
  // frame shows 352 × 442. The export is already turned and cropped.
  { src: foodImage, left: 368, top: 147, width: 352, height: 442, fit: "fill", z: 10 },
  { src: vendorImage, left: -19, top: -11, width: 569, height: 710, fit: "cover", z: 20 },
];

function HeroLayer({ layer }: { layer: Layer }) {
  return (
    <div
      className="absolute"
      style={{
        left: pct(layer.left, FRAME_W),
        top: pct(GROUP_TOP + layer.top, FRAME_H),
        width: pct(layer.width, FRAME_W),
        height: pct(layer.height, FRAME_H),
        zIndex: layer.z,
      }}
    >
      <Image
        src={layer.src}
        alt=""
        fill
        priority
        sizes="(min-width: 768px) 50vw, 0px"
        className={layer.fit === "cover" ? "object-cover" : "object-fill"}
      />
    </div>
  );
}

export default function AuthHero() {
  return (
    <div className="relative hidden w-full md:block">
      <div className="fixed inset-y-0 left-0 w-1/2 overflow-hidden bg-[#F3FAF3]">
        <Link href="/" className="absolute left-10 top-10 z-30">
          <Image
            src="/images/logo.svg"
            width={110}
            height={82}
            alt="MunchSpace"
            priority
            style={{ height: "auto" }}
          />
        </Link>

        {/* Behaves like object-cover: fills the panel and stays anchored to
            the bottom, so the vendor never floats on tall or wide screens. */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: `max(100%, calc(100vh * ${FRAME_W} / ${FRAME_H}))`,
            aspectRatio: `${FRAME_W} / ${FRAME_H}`,
            containerType: "inline-size",
          }}
        >
          {/* Figma: 600 × 140 at (60, 364), Rubik Bold 54 / 130%, layer at 30%
              opacity with a 3px background blur. */}
          <h1
            className="absolute z-0 flex items-center justify-center text-center font-rubik font-bold leading-[1.3] text-gray-800 opacity-30 backdrop-blur-[3px]"
            style={{
              left: pct(60, FRAME_W),
              top: pct(364, FRAME_H),
              width: pct(600, FRAME_W),
              height: pct(140, FRAME_H),
              fontSize: `${(54 / FRAME_W) * 100}cqw`,
            }}
          >
            <span>
              <span className="text-[#E76A39]">Elevate</span> Your Business
              <br />
              <span className="text-[#E76A39]">with</span> MunchSpace
            </span>
          </h1>

          {LAYERS.map((layer) => (
            <HeroLayer key={layer.src.src} layer={layer} />
          ))}
        </div>
      </div>
    </div>
  );
}
