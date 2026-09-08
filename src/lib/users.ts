import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export interface SafeUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateUserInput {
  name?: string | null;
  email: string;
  password: string;
  role?: string;
  image?: string | null;
}

export interface UpdateUserInput {
  name?: string | null;
  email?: string;
  password?: string;
  role?: string;
  image?: string | null;
}

export interface GetUsersOptions {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
  skip?: number;
}

export interface PaginatedUsersResult {
  users: SafeUser[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

/**
 * Fetch users from the database with optional search, role filter, and pagination.
 * Passwords are never returned.
 */
export async function getUsers(options: GetUsersOptions = {}): Promise<PaginatedUsersResult> {
  try {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const skip = options.skip !== undefined ? options.skip : (page - 1) * limit;

    const whereClause: {
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          email?: { contains: string; mode: "insensitive" };
        }>;
        role?: { equals: string; mode: "insensitive" };
      }>;
    } = {};

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { email: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (options.role && options.role !== "all") {
      conditions.push({
        role: { equals: options.role.trim().toLowerCase(), mode: "insensitive" as const },
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
        created_at: u.created_at,
        updated_at: u.updated_at,
      })),
      total,
      totalPages,
      currentPage: page,
      limit,
    };
  } catch (error) {
    console.error("Error fetching users from database:", error);
    return {
      users: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      limit: options.limit || 20,
    };
  }
}

/**
 * Fetch a single safe user by ID
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    return null;
  }
}

/**
 * Create a new user with hashed password
 */
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("ইমেইল প্রদান করা আবশ্যক (Email is required)");
  }

  if (!input.password || input.password.length < 6) {
    throw new Error(
      "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)"
    );
  }

  // Check uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new Error(`এই ইমেইল (${normalizedEmail}) দিয়ে ইতিমধ্যেই একজন ব্যবহারকারী বিদ্যমান`);
  }

  const hashedPassword = await hashPassword(input.password);
  const role = (input.role || "user").trim().toLowerCase();

  const user = await prisma.user.create({
    data: {
      name: input.name?.trim() || null,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      image: input.image?.trim() || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Update an existing user
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new Error("ব্যবহারকারী পাওয়া যায়নি (User not found)");
  }

  const dataToUpdate: {
    name?: string | null;
    email?: string;
    password?: string;
    role?: string;
    image?: string | null;
  } = {};

  if (input.name !== undefined) {
    dataToUpdate.name = input.name ? input.name.trim() : null;
  }

  if (input.email !== undefined) {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error("ইমেইল খালি রাখা যাবে না");
    }
    if (normalizedEmail !== existing.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailConflict && emailConflict.id !== id) {
        throw new Error(`এই ইমেইল (${normalizedEmail}) অন্য একজন ব্যবহারকারীর সাথে সংযুক্ত`);
      }
      dataToUpdate.email = normalizedEmail;
    }
  }

  if (input.password && input.password.trim().length > 0) {
    if (input.password.trim().length < 6) {
      throw new Error("পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে");
    }
    dataToUpdate.password = await hashPassword(input.password.trim());
  }

  if (input.role !== undefined) {
    dataToUpdate.role = input.role.trim().toLowerCase();
  }

  if (input.image !== undefined) {
    dataToUpdate.image = input.image ? input.image.trim() : null;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: dataToUpdate,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    image: updated.image,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete a user by ID
 */
export async function deleteUser(id: string, requestingUserId?: string): Promise<boolean> {
  if (requestingUserId && requestingUserId === id) {
    throw new Error("আপনি নিজের অ্যাকাউন্ট মুছতে পারবেন না (Cannot delete your own account)");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("ব্যবহারকারী পাওয়া যায়নি");
  }

  // Prevent deleting the last remaining admin
  if (user.role.toLowerCase() === "admin") {
    const adminCount = await prisma.user.count({
      where: { role: { equals: "admin", mode: "insensitive" } },
    });
    if (adminCount <= 1) {
      throw new Error("সিস্টেমের সর্বশেষ অ্যাডমিন অ্যাকাউন্ট মুছে ফেলা সম্ভব নয়");
    }
  }

  await prisma.user.delete({ where: { id } });
  return true;
}
