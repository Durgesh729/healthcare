import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Users, 
  MapPin, 
  Shield, 
  Smartphone, 
  BarChart3, 
  Cloud, 
  HeartPulse,
  ChevronRight,
  Check,
  Menu,
  X,
  ArrowRight,
  Globe,
  Building2,
  Heart,
  ClipboardCheck
} from 'lucide-react'

export const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 4)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: <Smartphone size={32} />,
      title: 'Mobile-First Design',
      description: 'Purpose-built for field workers in remote areas with offline-first architecture and low-bandwidth optimization.'
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'AI-Powered Analytics',
      description: 'Advanced health trend analysis and early disease outbreak detection powered by intelligent algorithms.'
    },
    {
      icon: <Shield size={32} />,
      title: 'Enterprise Security',
      description: 'HIPAA-compliant data handling with end-to-end encryption and role-based access control.'
    },
    {
      icon: <Cloud size={32} />,
      title: 'Real-Time Sync',
      description: 'Seamless data synchronization between field operations and central dashboard with conflict resolution.'
    }
  ]

  const targetSectors = [
    {
      icon: <Building2 size={40} />,
      title: 'Government Health Departments',
      description: 'Scale public health initiatives across districts and states with comprehensive monitoring.',
      items: ['National health programs', 'Disease surveillance', 'Policy implementation tracking']
    },
    {
      icon: <Heart size={40} />,
      title: 'NGOs & Non-Profits',
      description: 'Amplify your impact with data-driven field operations and donor reporting.',
      items: ['Program monitoring', 'Impact measurement', 'Donor transparency']
    },
    {
      icon: <Globe size={40} />,
      title: 'International Organizations',
      description: 'Coordinate multi-country health initiatives with standardized data collection.',
      items: ['Cross-border programs', 'WHO compliance', 'Global health metrics']
    },
    {
      icon: <ClipboardCheck size={40} />,
      title: 'Healthcare Networks',
      description: 'Connect remote clinics with central hospitals for integrated patient care.',
      items: ['Telemedicine support', 'Patient referrals', 'Resource allocation']
    }
  ]

  const plans = [
    {
      name: 'Starter',
      price: '₹4,999',
      period: '/month',
      description: 'Perfect for small NGOs and pilot programs',
      features: [
        'Up to 50 field workers',
        '5,000 beneficiaries',
        'Basic analytics',
        'Email support',
        'Mobile app access'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: '₹14,999',
      period: '/month',
      description: 'Ideal for growing organizations',
      features: [
        'Up to 200 field workers',
        '25,000 beneficiaries',
        'Advanced AI analytics',
        'Priority support',
        'Custom templates',
        'API access',
        'Training included'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For government and large-scale deployments',
      features: [
        'Unlimited field workers',
        'Unlimited beneficiaries',
        'On-premise deployment',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
        'White-label options'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  const stats = [
    { value: '500+', label: 'Organizations' },
    { value: '50K+', label: 'Field Workers' },
    { value: '2M+', label: 'Beneficiaries' },
    { value: '99.9%', label: 'Uptime' }
  ]

  const testimonials = [
    {
      quote: "Health Monitor transformed our rural health program. We reduced data collection time by 60% and improved accuracy significantly.",
      author: "Dr. Priya Sharma",
      role: "State Health Director",
      org: "Ministry of Health, Rajasthan"
    },
    {
      quote: "The offline capability is a game-changer. Our workers in remote tribal areas can now collect data without worrying about connectivity.",
      author: "Rajesh Kumar",
      role: "Program Manager",
      org: "UNICEF India"
    },
    {
      quote: "Implementation was smooth and the support team was exceptional. We scaled from 50 to 500 workers within months.",
      author: "Anita Desai",
      role: "Operations Head",
      org: "Doctors Without Borders"
    }
  ]

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <Activity size={28} />
            <span>Health Monitor</span>
          </div>
          
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`landing-nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
            <a href="/login" className="nav-login-btn">Login</a>
            <a href="/login" className="nav-cta-btn">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-pattern"></div>
        </div>
        <div className="landing-hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Trusted by 500+ organizations across 15 countries
          </div>
          <h1>
            Transform Public Health with
            <span className="hero-highlight"> Intelligent Field Operations</span>
          </h1>
          <p className="hero-subtitle">
            The complete SaaS platform for NGOs, governments, and healthcare organizations 
            to collect, analyze, and act on community health data in real-time.
          </p>
          <div className="hero-cta-group">
            <a href="/login" className="hero-cta-primary">
              Start Free Trial
              <ArrowRight size={20} />
            </a>
            <a href="#features" className="hero-cta-secondary">
              Watch Demo
            </a>
          </div>
          <div className="hero-stats">
            {stats.map((stat, idx) => (
              <div key={idx} className="hero-stat">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="landing-hero-visual">
          <div className="dashboard-preview">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span><span></span><span></span>
              </div>
              <span>Health Monitor Dashboard</span>
            </div>
            <div className="preview-content">
              <div className="preview-sidebar">
                <div className="preview-nav-item active"></div>
                <div className="preview-nav-item"></div>
                <div className="preview-nav-item"></div>
                <div className="preview-nav-item"></div>
              </div>
              <div className="preview-main">
                <div className="preview-card large"></div>
                <div className="preview-card-row">
                  <div className="preview-card"></div>
                  <div className="preview-card"></div>
                  <div className="preview-card"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2>Built for the Frontlines of Healthcare</h2>
            <p>Every feature designed with field workers and public health professionals in mind</p>
          </div>
          
          <div className="features-grid">
            {features.map((feature, idx) => (
              <div 
                key={idx} 
                className={`feature-card ${activeFeature === idx ? 'active' : ''}`}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="features-showcase">
            <div className="showcase-item">
              <Users size={24} />
              <span>Beneficiary Management</span>
            </div>
            <div className="showcase-item">
              <MapPin size={24} />
              <span>GPS Tracking</span>
            </div>
            <div className="showcase-item">
              <HeartPulse size={24} />
              <span>Health Records</span>
            </div>
            <div className="showcase-item">
              <Activity size={24} />
              <span>Real-time Analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="landing-section solutions-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Solutions</span>
            <h2>Tailored for Your Organization</h2>
            <p>Specialized solutions for different sectors of public health</p>
          </div>

          <div className="solutions-grid">
            {targetSectors.map((sector, idx) => (
              <div key={idx} className="solution-card">
                <div className="solution-icon">{sector.icon}</div>
                <h3>{sector.title}</h3>
                <p>{sector.description}</p>
                <ul className="solution-items">
                  {sector.items.map((item, i) => (
                    <li key={i}>
                      <Check size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-section how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2>Deploy in Days, Not Months</h2>
            <p>Simple onboarding process to get your team up and running quickly</p>
          </div>

          <div className="steps-container">
            <div className="step">
              <div className="step-number">01</div>
              <h3>Configure Templates</h3>
              <p>Use our pre-built health survey templates or create custom forms for your specific needs</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">02</div>
              <h3>Onboard Workers</h3>
              <p>Invite field workers via email. They download the app and login with their credentials</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">03</div>
              <h3>Collect Data</h3>
              <p>Workers collect health data offline in remote areas. Data syncs automatically when connected</p>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-number">04</div>
              <h3>Analyze & Act</h3>
              <p>View real-time dashboards, AI insights, and generate reports for stakeholders</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-section pricing-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Pricing</span>
            <h2>Transparent Pricing, No Hidden Fees</h2>
            <p>Choose a plan that scales with your organization's needs</p>
          </div>

          <div className="pricing-grid">
            {plans.map((plan, idx) => (
              <div key={idx} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <div className="pricing-price">
                    <span className="price-value">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                  <p>{plan.description}</p>
                </div>
                <ul className="pricing-features">
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <Check size={18} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="/login" className={`pricing-cta ${plan.popular ? 'primary' : ''}`}>
                  {plan.cta}
                  <ChevronRight size={18} />
                </a>
              </div>
            ))}
          </div>

          <div className="pricing-note">
            <p>💡 All plans include 14-day free trial. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="landing-section testimonials-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-tag">Testimonials</span>
            <h2>Trusted by Health Leaders Worldwide</h2>
            <p>See what our partners say about their experience</p>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-quote">
                  <p>"{testimonial.quote}"</p>
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="author-info">
                    <strong>{testimonial.author}</strong>
                    <span>{testimonial.role}</span>
                    <span className="author-org">{testimonial.org}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-section cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Ready to Transform Your Field Operations?</h2>
            <p>Join 500+ organizations already using Health Monitor to improve public health outcomes</p>
            <div className="cta-buttons">
              <a href="/login" className="cta-primary">
                Start Free Trial
                <ArrowRight size={20} />
              </a>
              <a href="/login" className="cta-secondary">
                Schedule Demo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="landing-logo">
                <Activity size={28} />
                <span>Health Monitor</span>
              </div>
              <p>Empowering organizations to deliver better health outcomes through intelligent field operations.</p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#solutions">Solutions</a>
                <a href="#">API Docs</a>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Careers</a>
                <a href="#">Blog</a>
                <a href="#">Contact</a>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <a href="#">Documentation</a>
                <a href="#">Help Center</a>
                <a href="#">Community</a>
                <a href="#">Status</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">HIPAA Compliance</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 Health Monitor. All rights reserved.</p>
            <div className="footer-social">
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
              <a href="#">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
