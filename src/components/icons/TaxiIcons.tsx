import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
}

// Taxi Logo Mark - Abstract road with motion
export const TaxiLogoMark = ({ className, size = 40 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="24" cy="24" r="22" className="fill-primary" />
    <path
      d="M12 28C12 28 16 24 24 24C32 24 36 20 36 20"
      className="stroke-primary-foreground"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M14 32C14 32 18 28 26 28C34 28 38 24 38 24"
      className="stroke-primary-foreground/60"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="18" cy="22" r="3" className="fill-primary-foreground" />
    <circle cx="30" cy="26" r="3" className="fill-primary-foreground" />
  </svg>
);

// Taxi Car - Side View
export const TaxiCarIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M16 8L17.5 12H20C21.1046 12 22 12.8954 22 14V16C22 16.5523 21.5523 17 21 17H20"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 17H3C2.44772 17 2 16.5523 2 16V14C2 12.8954 2.89543 12 4 12H6.5L8 8"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 8H16L17.5 12H6.5L8 8Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line x1="6.5" y1="12" x2="17.5" y2="12" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="17" r="2" strokeWidth="1.5" />
    <circle cx="17" cy="17" r="2" strokeWidth="1.5" />
    <line x1="9" y1="17" x2="15" y2="17" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="10" y="6" width="4" height="2" rx="0.5" className="fill-current stroke-none opacity-60" />
  </svg>
);

// Route Icon with Start & End
export const RouteIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="6" cy="6" r="3" strokeWidth="1.5" className="fill-success/20 stroke-success" />
    <circle cx="18" cy="18" r="3" strokeWidth="1.5" className="fill-primary/20 stroke-primary" />
    <path
      d="M6 9V12C6 14 8 14 12 14C16 14 18 14 18 16V15"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="3 2"
    />
  </svg>
);

// Map Pin - Pickup
export const PickupPinIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-success/20 stroke-success"
    />
    <circle cx="12" cy="9" r="2.5" strokeWidth="1.5" className="stroke-success" />
  </svg>
);

// Map Pin - Dropoff
export const DropoffPinIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-primary/20 stroke-primary"
    />
    <path d="M9 9L15 9M12 6L12 12" strokeWidth="1.5" strokeLinecap="round" className="stroke-primary" />
  </svg>
);

// Seat Icon
export const SeatIcon = ({ className, size = 24, available = true }: IconProps & { available?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn(className)}
  >
    <path
      d="M7 13V19M17 13V19M6 13H18C18.5523 13 19 12.5523 19 12V8C19 6.89543 18.1046 6 17 6H7C5.89543 6 5 6.89543 5 8V12C5 12.5523 5.44772 13 6 13Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={available ? "stroke-success fill-success/10" : "stroke-muted-foreground fill-muted"}
    />
    <path
      d="M9 10H15"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={available ? "stroke-success" : "stroke-muted-foreground"}
    />
  </svg>
);

// Clock / Time Icon
export const ClockIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
    <path d="M12 7V12L15 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Price Tag Icon
export const PriceTagIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M12 2L2 12L10 20C10.5 20.5 11.5 20.5 12 20L22 10V2H12Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="17" cy="7" r="2" strokeWidth="1.5" />
  </svg>
);

// Luggage Icon
export const LuggageIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <rect x="6" y="8" width="12" height="13" rx="2" strokeWidth="1.5" />
    <path d="M9 8V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V8" strokeWidth="1.5" />
    <line x1="6" y1="13" x2="18" y2="13" strokeWidth="1.5" />
    <line x1="9" y1="21" x2="9" y2="22" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15" y1="21" x2="15" y2="22" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Air Conditioner Icon
export const AirConditionerIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <rect x="3" y="4" width="18" height="8" rx="2" strokeWidth="1.5" />
    <path d="M6 16C6 16 7 14 9 14C11 14 13 18 15 18C17 18 18 16 18 16" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M6 20C6 20 7 18 9 18C11 18 13 22 15 22C17 22 18 20 18 20" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="6" y1="8" x2="18" y2="8" strokeWidth="1.5" />
  </svg>
);

// Driver Icon
export const DriverIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
    <path
      d="M4 20C4 16.6863 7.13401 14 11 14H13C16.866 14 20 16.6863 20 20"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M8 7L16 7" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 4C8 4 10 5 12 5C14 5 16 4 16 4" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Passenger Icon
export const PassengerIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="12" cy="7" r="4" strokeWidth="1.5" />
    <path
      d="M4 21C4 17.134 7.58172 14 12 14C16.4183 14 20 17.134 20 21"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// Phone Icon
export const PhoneIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M22 16.92V19.92C22 20.48 21.56 20.96 21 21C20.63 21.03 20.25 21.04 19.88 21C9.39 19.88 2.5 11.85 2 2.12C2 1.56 2.44 1.08 3 1.04C3.37 1.01 3.75 1 4.12 1H7.12C7.62 1 8.06 1.38 8.12 1.88L8.87 7.38C8.92 7.82 8.74 8.25 8.38 8.52L6.55 10.15C8.34 13.48 11.02 16.16 14.35 17.95L15.98 16.12C16.25 15.76 16.68 15.58 17.12 15.63L22.62 16.38C23.12 16.44 23.5 16.88 23.5 17.38V19.92"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Shield / Safety Icon
export const SafetyIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M12 2L4 6V12C4 16.42 7.4 20.44 12 22C16.6 20.44 20 16.42 20 12V6L12 2Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 12L11 14L15 10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Speed / Fast Icon
export const SpeedIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Women Only Icon
export const WomenOnlyIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="12" cy="8" r="5" strokeWidth="1.5" />
    <line x1="12" y1="13" x2="12" y2="21" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="9" y1="17" x2="15" y2="17" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Navigation Arrow
export const NavigationIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <path
      d="M3 11L22 2L13 21L11 13L3 11Z"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Multi-pickup Icon
export const MultiPickupIcon = ({ className, size = 24 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("stroke-current", className)}
  >
    <circle cx="6" cy="6" r="2.5" strokeWidth="1.5" className="fill-primary/20 stroke-primary" />
    <circle cx="18" cy="6" r="2.5" strokeWidth="1.5" className="fill-primary/20 stroke-primary" />
    <circle cx="12" cy="18" r="3" strokeWidth="1.5" className="fill-success/20 stroke-success" />
    <path d="M6 8.5V12L12 15" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
    <path d="M18 8.5V12L12 15" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);
