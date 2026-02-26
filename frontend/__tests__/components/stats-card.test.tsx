import { render, screen } from '@testing-library/react';
import StatsCard from '@/components/admin/stats-card';

describe('StatsCard Component', () => {
  it('should render title and value', () => {
    render(<StatsCard title="Total Students" value={150} icon="🎓" />);
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should render icon', () => {
    render(<StatsCard title="Teachers" value={20} icon="👨‍🏫" />);
    expect(screen.getByText('👨‍🏫')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(<StatsCard title="Fees" value="Rs. 50,000" icon="💰" subtitle="This month" />);
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('should not render subtitle when not provided', () => {
    render(<StatsCard title="Title" value={10} icon="📊" />);
    const subtitleEl = screen.queryByText('This month');
    expect(subtitleEl).toBeNull();
  });

  it('should render string value', () => {
    render(<StatsCard title="Revenue" value="Rs. 1,00,000" icon="💵" />);
    expect(screen.getByText('Rs. 1,00,000')).toBeInTheDocument();
  });

  it('should apply custom color class', () => {
    const { container } = render(<StatsCard title="Test" value={1} icon="🔵" color="bg-red-500" />);
    const coloredEl = container.querySelector('.bg-red-500');
    expect(coloredEl).toBeInTheDocument();
  });
});
