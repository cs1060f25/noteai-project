import { createFileRoute } from '@tanstack/react-router';
import { Target, Users, Zap } from 'lucide-react';

const AboutPage = () => {
    const team = [
        {
            name: 'Aaron Gong',
            degree: 'MS, Computer Science',
            university: 'Brown University'
        },
        {
            name: 'Anay Patel',
            degree: 'MS, Data Science',
            university: 'Harvard University'
        },
        {
            name: 'Miranda Shen',
            degree: 'MS, Data Science',
            university: 'Harvard University'
        },
        {
            name: 'Eliot Atlani',
            degree: 'MS, Data Science',
            university: 'Harvard University'
        }
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="py-20 px-6 lg:px-8 border-b border-border/50">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl font-bold mb-6">About NoteAI</h1>
                    <p className="text-xl text-muted-foreground">
                        Making educational content more accessible, one highlight at a time
                    </p>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-card rounded-xl p-8 border border-border/50">
                        <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                        <p className="text-lg text-muted-foreground mb-6">
                            In today's world, educational content is more abundant than ever—but it's also longer and harder to digest.
                            Students record 2-hour lectures. Educators create comprehensive course materials. Content creators produce
                            extensive tutorials. The problem? Finding the key moments in hours of footage is time-consuming and tedious.
                        </p>
                        <p className="text-lg text-muted-foreground mb-6">
                            That's why we built NoteAI. Our AI-powered platform automatically analyzes lecture videos, identifies the
                            most important moments, and creates shareable highlight clips—complete with professional subtitles. What used
                            to take hours of manual editing now happens in minutes.
                        </p>
                        <p className="text-lg text-muted-foreground">
                            Whether you're a student reviewing for exams, an educator creating supplemental materials, or a content creator
                            reaching wider audiences, NoteAI helps you focus on what matters most: the content itself.
                        </p>
                    </div>
                </div>
            </section>

            {/* Why It Matters */}
            <section className="py-16 px-6 lg:px-8 bg-muted/30">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Why This Matters</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <Target className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Save Time</h3>
                            <p className="text-muted-foreground">
                                Students and educators spend countless hours reviewing or editing videos.
                                NoteAI automates the tedious parts so you can focus on learning and teaching.
                            </p>
                        </div>
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Improve Retention</h3>
                            <p className="text-muted-foreground">
                                Short, focused clips are easier to digest and remember. Highlight reels help students
                                review key concepts efficiently without sitting through entire lectures.
                            </p>
                        </div>
                        <div className="glass-card rounded-xl p-6 border border-border/50">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">Share Knowledge</h3>
                            <p className="text-muted-foreground">
                                Short clips are more shareable. Educators can create preview materials, students can
                                help classmates, and creators can reach wider audiences on social media.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="py-16 px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Meet the Team</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {team.map((member, index) => (
                            <div
                                key={index}
                                className="glass-card rounded-xl p-6 border border-border/50"
                            >
                                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                                <p className="text-sm text-muted-foreground">{member.degree}</p>
                                <p className="text-sm text-muted-foreground">{member.university}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export const Route = createFileRoute('/about')({
    component: AboutPage,
});
