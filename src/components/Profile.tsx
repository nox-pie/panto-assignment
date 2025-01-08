import React, { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Octokit } from '@octokit/rest';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { LogOut, Github } from 'lucide-react'; // Logo icons
import type { Repository, User } from '../types';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      
      setUser({
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      });

      const token = localStorage.getItem('github_token');
      if (!token) {
        setError('GitHub token not found. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const octokit = new Octokit({ auth: token });
        
        // Test the token by getting the authenticated user
        await octokit.users.getAuthenticated();
        
        // Fetch repositories
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
          visibility: 'all',
          sort: 'updated',
          per_page: 100
        });

        // Get existing settings from Firestore
        const reposRef = collection(db, 'repositories');
        const q = query(reposRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const savedSettings = new Map();
        querySnapshot.forEach((doc) => {
          savedSettings.set(doc.data().repoName, doc.data().autoReview);
        });

        const mappedRepos = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          autoReview: savedSettings.get(repo.name) || false
        }));

        setRepositories(mappedRepos);
        setError(null);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to fetch repositories. Please sign in again.');
        localStorage.removeItem('github_token');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleToggleAutoReview = async (repoId: number, repoName: string, currentValue: boolean) => {
    if (!user) return;

    try {
      // Update local state
      const newRepositories = repositories.map(repo =>
        repo.id === repoId ? { ...repo, autoReview: !currentValue } : repo
      );
      setRepositories(newRepositories);

      // Update Firestore
      const docRef = doc(db, 'repositories', `${user.uid}_${repoName}`);
      await setDoc(docRef, {
        userId: user.uid,
        repoName: repoName,
        autoReview: !currentValue
      });
    } catch (error) {
      console.error('Error updating auto-review setting:', error);
      // Revert local state on error
      setRepositories(repositories);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('github_token');
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            Sign Out and Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {user?.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user?.displayName}</h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <Github className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Your Repositories</h2>
          </div>
          
          <div className="space-y-4">
            {repositories.length === 0 ? (
              <p className="text-gray-600 text-center py-4">No repositories found</p>
            ) : (
              repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-md"
                >
                  <span className="font-medium text-gray-700">{repo.name}</span>
                  <label className="flex items-center cursor-pointer">
                    <span className="mr-3 text-sm text-gray-600">Auto Review</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={repo.autoReview}
                        onChange={() => handleToggleAutoReview(repo.id, repo.name, repo.autoReview)}
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${
                        repo.autoReview ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                        repo.autoReview ? 'transform translate-x-6' : ''
                      }`}></div>
                    </div>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}