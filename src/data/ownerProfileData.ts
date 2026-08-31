import { Profile } from '@/types/profile';

/**
 * Predefined static profile dataset for the owner of HireLog.
 * Serves as the factual source of truth for profile seeding.
 */
export const OWNER_PROFILE: Profile = {
  personalDetails: {
    fullName: 'Mohammed Rinshad P',
    email: 'rinshadmorayur09@gmail.com',
    phone: '+91-9895612423',
    location: 'Kerala, India',
    linkedIn: 'https://www.linkedin.com/in/mrinshad/',
    github: 'https://github.com/mrinshad',
    portfolio: 'https://www.mrinshad.site/',
  },
  professionalInfo: {
    professionalTitle: 'Full-Stack Software Engineer',
    professionalSummary:
      'Full-Stack Software Engineer specializing in architecting and developing scalable web applications, ERP platforms, enterprise systems, and cloud-native solutions using React, Next.js, Node.js, .NET Core, Azure, and SQL technologies. Proven ability to lead technical decisions, establish engineering standards, perform code reviews, and deliver secure, maintainable, and production-ready software while remaining actively involved in hands-on development.',
  },
  skills: [
    // Frontend
    { id: 'skill-fe-1', name: 'React', category: 'Frontend' },
    { id: 'skill-fe-2', name: 'Next.js', category: 'Frontend' },
    { id: 'skill-fe-3', name: 'TypeScript', category: 'Frontend' },
    { id: 'skill-fe-4', name: 'JavaScript', category: 'Frontend' },
    { id: 'skill-fe-5', name: 'Material UI', category: 'Frontend' },
    { id: 'skill-fe-6', name: 'Shadcn/UI', category: 'Frontend' },

    // Backend
    { id: 'skill-be-1', name: 'Node.js', category: 'Backend' },
    { id: 'skill-be-2', name: 'Express.js', category: 'Backend' },
    { id: 'skill-be-3', name: '.NET Core', category: 'Backend' },
    { id: 'skill-be-4', name: 'Java', category: 'Backend' },
    { id: 'skill-be-5', name: 'REST APIs', category: 'Backend' },

    // Databases
    { id: 'skill-db-1', name: 'PostgreSQL', category: 'Databases' },
    { id: 'skill-db-2', name: 'SQL Server', category: 'Databases' },
    { id: 'skill-db-3', name: 'MySQL', category: 'Databases' },
    { id: 'skill-db-4', name: 'SQLite', category: 'Databases' },
    { id: 'skill-db-5', name: 'Supabase', category: 'Databases' },
    { id: 'skill-db-6', name: 'Prisma ORM', category: 'Databases' },

    // Cloud
    { id: 'skill-cl-1', name: 'Linux (RHEL)', category: 'Cloud' },
    { id: 'skill-cl-2', name: 'Azure', category: 'Cloud' },
    { id: 'skill-cl-3', name: 'Google Cloud Platform (GCP)', category: 'Cloud' },
    { id: 'skill-cl-4', name: 'Vercel', category: 'Cloud' },

    // DevOps / Infrastructure
    { id: 'skill-do-1', name: 'GitHub Actions', category: 'DevOps / Infrastructure' },
    { id: 'skill-do-2', name: 'NGINX', category: 'DevOps / Infrastructure' },

    // Tools
    { id: 'skill-tl-1', name: 'Git', category: 'Tools' },
    { id: 'skill-tl-2', name: 'GitHub', category: 'Tools' },
    { id: 'skill-tl-3', name: 'Postman', category: 'Tools' },
    { id: 'skill-tl-4', name: 'Firebase', category: 'Tools' },

    // Software Engineering / Other
    { id: 'skill-ot-1', name: 'System Design', category: 'Other' },
    { id: 'skill-ot-2', name: 'Database Design', category: 'Other' },
    { id: 'skill-ot-3', name: 'Authentication & Authorization', category: 'Other' },
    { id: 'skill-ot-4', name: 'CI/CD', category: 'Other' },
    { id: 'skill-ot-5', name: 'Agile Development', category: 'Other' },
  ],
  experience: [
    {
      id: 'exp-tcs',
      company: 'Tata Consultancy Services (TCS)',
      jobTitle: 'Full-Stack Developer',
      location: 'Chennai, Tamilnadu',
      startDate: 'Jun 2025',
      endDate: 'Present',
      currentlyWorking: true,
      description:
        'Architecting and developing enterprise-scale web applications and full-stack services. Collaborating with cross-functional engineering teams to implement production features, perform code reviews, and optimize application performance.',
      technologies: 'React, Node.js, TypeScript, REST APIs, PostgreSQL',
    },
    {
      id: 'exp-byten',
      company: 'ByteN',
      jobTitle: 'Technical Lead & Full-Stack Developer',
      location: 'Remote',
      startDate: 'Jul 2025',
      endDate: 'Present',
      currentlyWorking: true,
      description:
        'Leading technical decisions, system architecture, database design, and development standards for client enterprise systems. Directing full-stack implementations, conducting rigorous code reviews, and ensuring robust security and CI/CD pipelines.',
      technologies: 'Next.js, Node.js, PostgreSQL, Azure, Prisma ORM',
    },
    {
      id: 'exp-veynad',
      company: 'Veynad Pty Ltd',
      jobTitle: 'Full-Stack Developer (Remote Contract)',
      location: 'Melbourne, Australia',
      startDate: 'Apr 2025',
      endDate: 'Jun 2025',
      currentlyWorking: false,
      description:
        'Developed full-stack web applications and microservices on international contract engagements. Implemented dynamic user interfaces, RESTful backend APIs, and integrated database workflows.',
      technologies: 'React, Next.js, Node.js, PostgreSQL, REST APIs',
    },
    {
      id: 'exp-griantek',
      company: 'Griantek',
      jobTitle: 'Full-Stack Developer',
      location: 'Kochi, Kerala (Hybrid)',
      startDate: 'Dec 2024',
      endDate: 'Apr 2025',
      currentlyWorking: false,
      description:
        'Built scalable web applications, REST APIs, and database integration workflows. Optimized database queries and streamlined frontend-backend state management.',
      technologies: 'React, Node.js, Express.js, SQL Server, TypeScript',
    },
    {
      id: 'exp-wizzo',
      company: 'Wizzo Technologies',
      jobTitle: 'Full-Stack Developer',
      location: 'Chemmad, Kerala',
      startDate: 'Aug 2021',
      endDate: 'Jun 2022',
      currentlyWorking: false,
      description:
        'Engineered responsive web interfaces and backend endpoints. Designed relational database schemas and delivered client-facing software applications.',
      technologies: 'JavaScript, Node.js, MySQL, REST APIs',
    },
  ],
  projects: [
    {
      id: 'proj-school-mgmt',
      projectName: 'School Management System (Client Project)',
      projectTypeOrDomain: 'ERP / Education',
      technologies: 'Next.js, Node.js, Prisma ORM, PostgreSQL, Supabase, Shadcn/UI',
      description:
        'Multi-tenant cloud-based school management platform for administration, student records, fee handling, and communication.',
      featuresOrWorkDone:
        'Multi-tenant data isolation, automated fee billing, student enrollment lifecycle, and role-based access control.',
      myContribution:
        'Architected the full system design, implemented frontend dashboards with Next.js/Shadcn, and built secure backend services with Prisma and PostgreSQL.',
    },
    {
      id: 'proj-crusher-erp',
      projectName: 'Crusher ERP & Accounting System (Client Project)',
      projectTypeOrDomain: 'ERP / Industrial Accounting',
      technologies: 'Next.js, Node.js, Prisma ORM, PostgreSQL',
      description:
        'Enterprise resource planning and accounting platform for quarry and stone crusher industrial operations.',
      featuresOrWorkDone:
        'Trip-sheet tracking, real-time weighing integration, invoice generation, inventory management, and daily ledger auditing.',
      myContribution:
        'Designed normalized PostgreSQL schema, engineered transaction-safe accounting logic, and built responsive web interfaces.',
    },
    {
      id: 'proj-evm-simulator',
      projectName: 'Election Voting Machine (EVM) Simulator',
      projectTypeOrDomain: 'Simulation / Web Application',
      technologies: 'Next.js, Node.js, Prisma ORM, PostgreSQL',
      description:
        'Interactive Electronic Voting Machine simulator replicating electoral workflows, ballot security, and result tabulation.',
      featuresOrWorkDone:
        'Real-time ballot casting, verifiable vote auditing, candidate configuration, and tamper-resistant tallying engine.',
      myContribution:
        'Engineered the voting simulation interface, audit logging algorithms, and state verification pipelines.',
    },
    {
      id: 'proj-byteflow',
      projectName: 'byteFlow - Project Management Platform (Kanban)',
      projectTypeOrDomain: 'Productivity / SaaS',
      technologies: 'Next.js, Node.js, Prisma ORM, PostgreSQL',
      description:
        'Collaborative Kanban project management platform featuring real-time sprint tracking and task workflow automation.',
      featuresOrWorkDone:
        'Interactive drag-and-drop Kanban board, sprint progress analytics, user assignment, activity timelines, and custom status columns.',
      myContribution:
        'Architected the full-stack application, implemented drag-and-drop state synchronization, and structured database queries.',
    },
  ],
  education: [
    {
      id: 'edu-mace',
      degree: 'B.Tech in Computer Science and Engineering (Data Science)',
      institution: 'Mar Athanasius College of Engineering, Kothamangalam, Kerala',
      location: 'Kothamangalam, Kerala',
      startDate: '2021',
      endDate: '2024',
      description:
        'Coursework in Data Structures, Algorithms, Database Systems, Software Engineering, and Distributed Systems.',
    },
    {
      id: 'edu-aknm',
      degree: 'Diploma in Computer Engineering',
      institution: 'AKNM GPTC Thirurangadi, Thirurangadi, Kerala',
      location: 'Thirurangadi, Kerala',
      startDate: '2018',
      endDate: '2021',
      description:
        'Foundational studies in Computer Hardware, Networking, Operating Systems, C/C++, and Web Development.',
    },
  ],
  certifications: [],
};
