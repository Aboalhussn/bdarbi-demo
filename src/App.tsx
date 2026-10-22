import { useEffect, useState, type ComponentType } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useStore } from './store';
import { Login, OnboardLocation, OnboardNotify, Otp, PartnerLogin, Register, Splash } from './screens/Welcome';
import { AdminApp } from './screens/Admin';
import { Help, Settings } from './screens/Settings';
import { Offline, SeatTaken, TripCancelled } from './screens/States';
import { ForgotPassword, OfficePending, OfficeRegister, ResetPassword } from './screens/Accounts';
import { IS_PARTNER } from './mode';
import { Garages, Home, Rewards, Search, Trips } from './screens/Discover';
import { Checkout, MyTrips, Profile, Seats, Ticket } from './screens/Booking';
import { Coaster, HotelDetails, Hotels } from './screens/Hotels';
import { PersonalInfo, Wallet } from './screens/Account';
import { Track } from './screens/Track';
import { Policy } from './screens/Policy';
import { Notifications, Rate } from './screens/Feedback';
import { CaptainPending, CaptainRegister } from './screens/Captain';
import { DriverAddTrip, DriverHome, DriverRequests, DriverScan, DriverScanResult, DriverTrip } from './screens/Driver';
import { CaptainVehicle, CaptainWallet, DriverGoals, DriverProfile } from './screens/CaptainAccount';
import { Support } from './screens/Support';
import { Pay } from './screens/Pay';
import { AgencyNew, PackageBook, PackageDetail, PkgCreate, PkgTicket } from './screens/Packages';
import { AgencyAddVehicle, AgencyDrivers, AgencyFleet, AgencyHome, AgencyInfo, AgencyProfile, AgencyTripDetail, AgencyTrips } from './screens/Agency';

const SCREENS: Record<string, ComponentType> = {
  splash: Splash,
  onboardLocation: OnboardLocation,
  onboardNotify: OnboardNotify,
  login: IS_PARTNER ? PartnerLogin : Login,
  register: Register,
  otp: Otp,
  home: Home,
  trips: Trips,
  search: Search,
  garages: Garages,
  rewards: Rewards,
  seats: Seats,
  checkout: Checkout,
  ticket: Ticket,
  myTrips: MyTrips,
  profile: Profile,
  personalInfo: PersonalInfo,
  wallet: Wallet,
  track: Track,
  policy: Policy,
  rate: Rate,
  captainRegister: CaptainRegister,
  captainPending: CaptainPending,
  notifications: Notifications,
  support: Support,
  pay: Pay,
  admin: AdminApp,
  forgot: ForgotPassword,
  settings: Settings,
  tripCancelled: TripCancelled,
  seatTaken: SeatTaken,
  help: Help,
  resetPassword: ResetPassword,
  officeRegister: OfficeRegister,
  officePending: OfficePending,
  package: PackageDetail,
  packageBook: PackageBook,
  pkgTicket: PkgTicket,
  agencyNew: AgencyNew,
  pkgCreate: PkgCreate,
  agencyHome: AgencyHome,
  agencyTrips: AgencyTrips,
  agencyTrip: AgencyTripDetail,
  agencyAddVehicle: AgencyAddVehicle,
  agencyDrivers: AgencyDrivers,
  agencyInfo: AgencyInfo,
  agencyFleet: AgencyFleet,
  agencyProfile: AgencyProfile,
  captainWallet: CaptainWallet,
  captainVehicle: CaptainVehicle,
  driverGoals: DriverGoals,
  hotels: Hotels,
  hotel: HotelDetails,
  coaster: Coaster,
  driverHome: DriverHome,
  driverTrip: DriverTrip,
  driverScan: DriverScan,
  driverScanResult: DriverScanResult,
  driverRequests: DriverRequests,
  driverAddTrip: DriverAddTrip,
  driverProfile: DriverProfile,
};

// Screens whose top edge is navy get a navy status bar; the rest get white.
const NAVY_TOP = new Set(['splash', 'login', 'trips', 'ticket', 'profile', 'driverHome', 'driverProfile', 'driverScan', 'driverGoals', 'agencyHome', 'agencyProfile', 'admin']);

export default function App() {
  const { route, stackDepth, back, toast, role, dark, lang } = useStore();

  // Dark mode and the chosen language apply to the whole app.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'ku' ? 'ckb' : 'ar';
  }, [dark, lang]);
  const Screen = SCREENS[route.name] ?? Home;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapApp.addListener('backButton', () => {
      // Close an open bottom sheet first, then go back a screen, then leave the app.
      const sheet = document.querySelector('.sheet-back') as HTMLElement | null;
      if (sheet) {
        sheet.click();
        return;
      }
      if (!back()) void CapApp.exitApp();
    });
    return () => {
      void sub.then((s) => s.remove());
    };
  }, [back]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const navy = NAVY_TOP.has(route.name);
    const color = route.name === 'driverScan' ? '#000000' : navy ? '#0B0558' : route.name === 'hotel' ? '#DCD8EE' : '#FFFFFF';
    void StatusBar.setBackgroundColor({ color }).catch(() => undefined);
    void StatusBar.setStyle({ style: navy ? Style.Dark : Style.Light }).catch(() => undefined);
  }, [route.name]);

  // No internet: the real event, or the demo button in settings.
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const off = () => setOffline(true);
    const on = () => setOffline(false);
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    window.addEventListener('bdarbi-offline-demo', off);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
      window.removeEventListener('bdarbi-offline-demo', off);
    };
  }, []);

  return (
    <div className={`app ${role === 'admin' ? 'app-admin' : ''}`}>
      <Screen key={`${stackDepth}-${route.name}`} />
      {offline ? <Offline onRetry={() => { if (navigator.onLine) setOffline(false); }} /> : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
