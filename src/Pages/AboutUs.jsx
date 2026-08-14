import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Code2,
  ClipboardList,
  Mail,
  Phone,
  MapPin,
  Link2,
  Briefcase,
  Terminal,
  MessageCircle,
} from "lucide-react";
import { DEFAULT_ABOUT_CONTACT, listenToAboutContact } from "../lib/aboutConfig";
import antorPhoto from "../assets/team/antor-biswas.png";
import shadmanPhoto from "../assets/team/shadman-rahman.png";
import "./AboutUs.css";

function waLink(number) {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
}

const team = [
  {
    role: "Developer",
    name: "Antor Biswas",
    subtitle: "CSE (IOT, Cyber Security & Blockchain Tech)",
    org: "Institute of Engineering and Management, Kolkata",
    icon: Code2,
    colorClass: "about-team-dev",
    photo: antorPhoto,
    links: [
      { icon: Link2, label: "Facebook", href: "https://www.facebook.com/antor.biswas.965" },
      { icon: Briefcase, label: "LinkedIn", href: "https://www.linkedin.com/in/antor-biswas-680752238" },
      { icon: Terminal, label: "GitHub", href: "https://github.com/antor1010" },
      { icon: MessageCircle, label: "WhatsApp", href: waLink("+916297751533") },
    ],
  },
  {
    role: "Developer",
    name: "Shadman Rahman Anannya",
    subtitle: "CSE",
    org: "Daffodil International University",
    icon: Code2,
    colorClass: "about-team-dev",
    photo: shadmanPhoto,
    links: [
      { icon: Link2, label: "Facebook", href: "https://www.facebook.com/shadman.rahman.2024" },
      { icon: Briefcase, label: "LinkedIn", href: "https://www.linkedin.com/in/shadman-rahman-anannya" },
      { icon: MessageCircle, label: "WhatsApp", href: waLink("+8801303015691") },
    ],
  },
  {
    role: "Project Manager",
    name: "Md. Akram Islam Molla",
    subtitle: "CSE (IOT, Cyber Security & Blockchain Tech)",
    org: "Institute of Engineering and Management, Kolkata",
    icon: ClipboardList,
    colorClass: "about-team-owner",
    photo: null,
    links: [{ icon: MessageCircle, label: "WhatsApp", href: waLink("+919883857132") }],
  },
];

function AboutUs() {
  const [contact, setContact] = useState(DEFAULT_ABOUT_CONTACT);

  useEffect(() => {
    const unsubscribe = listenToAboutContact(setContact);
    return unsubscribe;
  }, []);

  return (
    <div className="about-page">
      <div className="about-inner">
        <section className="about-hero surface-card">
          <div>
            <p className="about-kicker">About Us</p>
            <h1>Who builds and runs Altcafe</h1>
            <p className="about-copy">
              Meet the team behind the app — the people who built it and keep it running.
            </p>
          </div>
          <span className="about-badge">
            <BadgeCheck size={16} strokeWidth={2.2} />
            Verified team
          </span>
        </section>

        <section className="about-team-grid">
          {team.map(({ role, name, subtitle, org, icon: Icon, colorClass, photo, links }) => (
            <article key={name} className={`surface-card about-team-card ${colorClass}`}>
              <div className="about-team-top">
                {photo ? (
                  <img src={photo} alt={name} className="about-team-photo" />
                ) : (
                  <span className="about-team-icon">
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                )}
                <p className="about-team-role">{role}</p>
                <h2>{name}</h2>
              </div>
              <ul className="about-team-list">
                <li>{subtitle}</li>
                <li>{org}</li>
              </ul>
              {links.length > 0 && (
                <div className="about-team-links">
                  {links.map(({ icon: LinkIcon, label, href }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                      <LinkIcon size={16} strokeWidth={2.2} />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>

        <section className="surface-card about-roadmap">
          <div className="about-roadmap-head">
            <div>
              <p className="about-kicker">Contact & Support</p>
              <h2>Get in touch</h2>
            </div>
          </div>
          <div className="about-contact-row">
            <span>
              <Mail size={16} strokeWidth={2.2} /> {contact.email}
            </span>
            <span>
              <Phone size={16} strokeWidth={2.2} /> {contact.phone}
            </span>
            <span>
              <MapPin size={16} strokeWidth={2.2} /> {contact.location}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AboutUs;