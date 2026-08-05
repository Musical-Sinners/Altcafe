import { BadgeCheck, Crown, Shield, Code2, Users, Mail, Phone, MapPin } from "lucide-react";
import "./AboutUs.css";

const team = [
  {
    role: "Developer",
    name: "Your Name",
    icon: Code2,
    colorClass: "about-team-dev",
    details: ["Frontend and Firebase integration", "Referral flow and profile screens", "React UI polish"],
  },
  {
    role: "Admin",
    name: "Another Person",
    icon: Shield,
    colorClass: "about-team-admin",
    details: ["User support and moderation", "Bookings and wallet oversight", "Content and updates review"],
  },
  {
    role: "Owner",
    name: "Project Owner",
    icon: Crown,
    colorClass: "about-team-owner",
    details: ["Business approvals", "Feature priorities", "Revenue and operations"],
  },
];

const upcomingItems = [
  "Payment methods management",
  "Notification preferences",
  "Help and support contacts",
  "Terms, privacy, and policy links",
  "Admin contact and escalation details",
];

function AboutUs() {
  return (
    <div className="about-page">
      <div className="about-inner">
        <section className="about-hero surface-card">
          <div>
            <p className="about-kicker">About Us</p>
            <h1>Who builds and runs Altcafe</h1>
            <p className="about-copy">
              This page is a demo team overview for the developer, admin, and owner roles.
              Replace the placeholder details with your real team names when you are ready.
            </p>
          </div>
          <span className="about-badge">
            <BadgeCheck size={16} strokeWidth={2.2} />
            Demo profile
          </span>
        </section>

        <section className="about-team-grid">
          {team.map(({ role, name, icon: Icon, colorClass, details }) => (
            <article key={role} className={`surface-card about-team-card ${colorClass}`}>
              <div className="about-team-top">
                <span className="about-team-icon">
                  <Icon size={18} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="about-team-role">{role}</p>
                  <h2>{name}</h2>
                </div>
              </div>
              <ul className="about-team-list">
                {details.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="surface-card about-roadmap">
          <div className="about-roadmap-head">
            <div>
              <p className="about-kicker">Coming Next</p>
              <h2>What we will add later</h2>
            </div>
            <Users size={18} strokeWidth={2.2} />
          </div>
          <div className="about-roadmap-grid">
            {upcomingItems.map((item) => (
              <div key={item} className="about-roadmap-item">
                {item}
              </div>
            ))}
          </div>
          <div className="about-contact-row">
            <span><Mail size={16} strokeWidth={2.2} /> support@example.com</span>
            <span><Phone size={16} strokeWidth={2.2} /> +880 1XXX-XXXXXX</span>
            <span><MapPin size={16} strokeWidth={2.2} /> Demo location</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AboutUs;