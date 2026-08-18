export interface RoadmapDay {
  day: number;
  title: string;
  duration: string;
  description: string;
  completed: boolean;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  days: RoadmapDay[];
}

export interface Roadmap {
  id: string;
  topic: string;
  weeks: RoadmapWeek[];
  progress: number;
}

export const sampleRoadmap: Roadmap = {
  id: "1",
  topic: "Linear Algebra for AI",
  progress: 0,
  weeks: [
    {
      week: 1,
      title: "Foundations of Vectors & Matrices",
      days: [
        { day: 1, title: "Vectors & Scalar Operations", duration: "3 hours", description: "Understanding vectors, scalar multiplication, and basic operations in n-dimensional space.", completed: false },
        { day: 2, title: "Matrix Fundamentals", duration: "3 hours", description: "Matrix notation, types of matrices, and fundamental matrix operations.", completed: false },
        { day: 3, title: "Matrix Multiplication", duration: "2.5 hours", description: "Deep dive into matrix multiplication rules, properties, and computational techniques.", completed: false },
        { day: 4, title: "Dot Product & Cross Product", duration: "2 hours", description: "Geometric interpretation and applications of dot and cross products.", completed: false },
        { day: 5, title: "Practice & Review", duration: "2 hours", description: "Exercises combining all Week 1 concepts with real-world applications.", completed: false },
      ],
    },
    {
      week: 2,
      title: "Linear Transformations & Spaces",
      days: [
        { day: 1, title: "Linear Transformations", duration: "3 hours", description: "Understanding linear maps, kernel, and image of a transformation.", completed: false },
        { day: 2, title: "Vector Spaces & Subspaces", duration: "3 hours", description: "Axioms of vector spaces, subspaces, and spanning sets.", completed: false },
        { day: 3, title: "Basis & Dimension", duration: "2.5 hours", description: "Finding bases, understanding dimension, and change of basis.", completed: false },
        { day: 4, title: "Rank & Nullity", duration: "2 hours", description: "The rank-nullity theorem and its applications.", completed: false },
        { day: 5, title: "Practice & Review", duration: "2 hours", description: "Problem-solving session on transformations and spaces.", completed: false },
      ],
    },
    {
      week: 3,
      title: "Eigenvalues & Applications",
      days: [
        { day: 1, title: "Determinants", duration: "3 hours", description: "Computing determinants, properties, and geometric meaning.", completed: false },
        { day: 2, title: "Eigenvalues & Eigenvectors", duration: "3 hours", description: "Finding eigenvalues/eigenvectors and understanding their significance.", completed: false },
        { day: 3, title: "Diagonalization", duration: "2.5 hours", description: "When and how to diagonalize a matrix, and why it matters.", completed: false },
        { day: 4, title: "SVD & PCA Introduction", duration: "3 hours", description: "Singular Value Decomposition and Principal Component Analysis basics.", completed: false },
        { day: 5, title: "Linear Algebra in AI", duration: "2 hours", description: "Applying linear algebra concepts to neural networks and machine learning.", completed: false },
      ],
    },
  ],
};

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const sampleQuiz: QuizQuestion[] = [
  {
    id: 1,
    question: "What is the result of multiplying a vector [2, 3] by scalar 4?",
    options: ["[6, 7]", "[8, 12]", "[2, 12]", "[8, 3]"],
    correctAnswer: 1,
    explanation: "Scalar multiplication multiplies each component: [2×4, 3×4] = [8, 12].",
  },
  {
    id: 2,
    question: "Which property does the dot product of two perpendicular vectors have?",
    options: ["It equals 1", "It equals 0", "It equals -1", "It is undefined"],
    correctAnswer: 1,
    explanation: "Perpendicular (orthogonal) vectors have a dot product of zero: a·b = |a||b|cos(90°) = 0.",
  },
  {
    id: 3,
    question: "What is the identity matrix?",
    options: [
      "A matrix with all zeros",
      "A matrix with ones on the diagonal and zeros elsewhere",
      "A matrix with all ones",
      "A matrix that is its own inverse",
    ],
    correctAnswer: 1,
    explanation: "The identity matrix has 1s on the main diagonal and 0s everywhere else. It acts as the multiplicative identity.",
  },
  {
    id: 4,
    question: "If A is a 3×2 matrix and B is a 2×4 matrix, what is the dimension of AB?",
    options: ["3×4", "2×2", "3×2", "4×3"],
    correctAnswer: 0,
    explanation: "For matrix multiplication AB, the result has rows from A (3) and columns from B (4), giving 3×4.",
  },
  {
    id: 5,
    question: "What does the rank of a matrix represent?",
    options: [
      "The number of rows",
      "The determinant value",
      "The maximum number of linearly independent column vectors",
      "The trace of the matrix",
    ],
    correctAnswer: 2,
    explanation: "The rank equals the maximum number of linearly independent rows or columns in the matrix.",
  },
];

export const sampleLessonContent = `# Vectors & Scalar Operations

## What is a Vector?

A **vector** is a mathematical object that has both **magnitude** (size) and **direction**. In the context of AI and machine learning, vectors are fundamental building blocks used to represent data.

### Notation

A vector in n-dimensional space is written as:

**v** = [v₁, v₂, ..., vₙ]

For example, a 3D vector: **v** = [3, -1, 4]

## Scalar Operations

### Scalar Multiplication

When you multiply a vector by a scalar (a single number), each component gets multiplied:

**c · v** = [c·v₁, c·v₂, ..., c·vₙ]

**Example:** 3 · [2, -1, 4] = [6, -3, 12]

### Vector Addition

Two vectors of the same dimension can be added component-wise:

**u + v** = [u₁+v₁, u₂+v₂, ..., uₙ+vₙ]

## Why Vectors Matter in AI

- **Feature Representation:** Each data point is a vector of features
- **Word Embeddings:** Words are mapped to high-dimensional vectors
- **Neural Networks:** Weights and activations are vector/matrix operations
- **Gradient Descent:** The gradient is a vector pointing toward steepest ascent

## Geometric Interpretation

Vectors can be visualized as arrows in space. The **length** (magnitude) is calculated using:

‖v‖ = √(v₁² + v₂² + ... + vₙ²)

The **direction** tells us where the vector points in space.
`;
