import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex flex-col items-center justify-center text-white px-4">
      <div className="text-center max-w-3xl">
        <div className="text-6xl mb-4">🏫</div>
        <h1 className="text-5xl font-bold mb-4">School Management System</h1>
        <p className="text-xl text-primary-100 mb-10">
          Complete solution for school administration, fee management, and more.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <Link
            href="/register-school"
            className="bg-white text-primary-700 hover:bg-primary-50 font-bold py-3 px-8 rounded-xl text-lg transition-colors shadow-lg"
          >
            Register Your School
          </Link>
          <Link
            href="/login"
            className="bg-white/10 hover:bg-white/20 border border-white/30 font-bold py-3 px-8 rounded-xl text-lg transition-colors backdrop-blur"
          >
            Login
          </Link>
        </div>

        {/* Portal quick-links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Admin Portal',   icon: '🏫' },
            { label: 'Teacher Portal', icon: '👨‍🏫' },
            { label: 'Parent Portal',  icon: '👨‍👩‍👦' },
            { label: 'Student Portal', icon: '🎓' },
          ].map((portal) => (
            <Link
              key={portal.label}
              href="/login"
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-4 text-center transition-all"
            >
              <div className="text-3xl mb-2">{portal.icon}</div>
              <div className="font-medium text-sm">{portal.label}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          { title: 'Online Payments',     desc: 'JazzCash, EasyPaisa, Bank Transfer',    icon: '💳' },
          { title: 'Attendance Tracking', desc: 'Mark and monitor daily attendance',      icon: '📋' },
          { title: 'Result Management',   desc: 'Enter marks and generate report cards',  icon: '📊' },
          { title: 'Fee Management',      desc: 'Generate invoices and track payments',   icon: '💰' },
          { title: 'Messaging System',    desc: 'Communication between all stakeholders', icon: '💬' },
          { title: 'Homework Portal',     desc: 'Assign and track homework',              icon: '📚' },
        ].map((feature) => (
          <div key={feature.title} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="text-2xl mb-2">{feature.icon}</div>
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-primary-200 text-sm mt-1">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
