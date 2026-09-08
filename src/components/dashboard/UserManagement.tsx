"use client";

import { useMemo, useState, useTransition } from "react";

import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFilterLine,
  RiLoader4Line,
  RiMailLine,
  RiRefreshLine,
  RiSearchLine,
  RiShieldUserLine,
  RiUserAddLine,
  RiUserLine,
  RiUserSettingsLine,
} from "@remixicon/react";

import {
  createUserAction,
  deleteUserAction,
  fetchUsersAction,
  updateUserAction,
} from "@/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import type { CreateUserInput, SafeUser, UpdateUserInput } from "@/lib/users";

const ROLES = [
  { value: "admin", label: "অ্যাডমিন (Admin)", desc: "সম্পূর্ণ প্রশাসনিক নিয়ন্ত্রণ" },
  { value: "staff", label: "স্টাফ (Staff)", desc: "পণ্য ও গ্রাহক পরিচালনার অনুমতি" },
  { value: "user", label: "সাধারণ ইউজার (User)", desc: "সাধারণ অ্যাক্সেস" },
];

function getRoleBadge(role: string) {
  switch (role.toLowerCase()) {
    case "admin":
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 text-purple-800 ring-1 ring-purple-600/20 dark:bg-purple-950/60 dark:text-purple-300"
        >
          <RiShieldUserLine className="mr-1 size-3" />
          অ্যাডমিন (ADMIN)
        </Badge>
      );
    case "staff":
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 ring-1 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300"
        >
          <RiUserSettingsLine className="mr-1 size-3" />
          স্টাফ (STAFF)
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-slate-50 text-slate-700 ring-1 ring-slate-400/20 dark:bg-slate-800 dark:text-slate-300"
        >
          <RiUserLine className="mr-1 size-3" />
          ইউজার (USER)
        </Badge>
      );
  }
}

interface UserManagementProps {
  initialUsers: SafeUser[];
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const [usersList, setUsersList] = useState<SafeUser[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state (20 items per page by default)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Active user for view/edit/delete
  const [activeUser, setActiveUser] = useState<SafeUser | null>(null);

  // Form states
  const [formData, setFormData] = useState<CreateUserInput>({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [editPassword, setEditPassword] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Toast / Notification banner
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const showFeedback = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4500);
  };

  // Filtered users in memory
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        !searchTerm.trim() ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        selectedRoleFilter === "all" || u.role.toLowerCase() === selectedRoleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [usersList, searchTerm, selectedRoleFilter]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Stats calculation
  const totalCount = usersList.length;
  const adminCount = usersList.filter((u) => u.role.toLowerCase() === "admin").length;
  const staffCount = usersList.filter((u) => u.role.toLowerCase() === "staff").length;
  const generalUserCount = usersList.filter((u) => u.role.toLowerCase() === "user").length;

  // Refresh data from server
  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(async () => {
      const res = await fetchUsersAction({ limit: 1000 });
      setUsersList(res.users);
      setIsRefreshing(false);
      showFeedback("success", "ব্যবহারকারী তালিকা সফলভাবে রিফ্রেশ হয়েছে");
    });
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (user: SafeUser) => {
    setActiveUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
    });
    setEditPassword("");
    setFormErrors({});
    setIsEditOpen(true);
  };

  // Open Delete Dialog
  const handleOpenDelete = (user: SafeUser) => {
    setActiveUser(user);
    setIsDeleteOpen(true);
  };

  // Open Preview Dialog
  const handleOpenPreview = (user: SafeUser) => {
    setActiveUser(user);
    setIsPreviewOpen(true);
  };

  // Validate Add Form
  const validateAddForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email?.trim()) {
      errors.email = "ইমেইল প্রদান করা আবশ্যক";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "সঠিক ইমেইল ফরম্যাট প্রদান করুন";
      }
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = "পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.email?.trim()) {
      errors.email = "ইমেইল প্রদান করা আবশ্যক";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "সঠিক ইমেইল ফরম্যাট প্রদান করুন";
      }
    }

    if (editPassword && editPassword.trim().length < 6) {
      errors.password = "পাসওয়ার্ড পরিবর্তন করতে চাইলে ন্যূনতম ৬ অক্ষরের হতে হবে";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    startTransition(async () => {
      const res = await createUserAction(formData);

      if (res.success && res.data) {
        setUsersList((prev) => [res.data!, ...prev]);
        setIsAddOpen(false);
        showFeedback("success", `ব্যবহারকারী "${res.data.email}" সফলভাবে তৈরি করা হয়েছে!`);
      } else {
        showFeedback("error", res.error || "ব্যবহারকারী তৈরি করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !validateEditForm()) return;

    const payload: UpdateUserInput = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
    };
    if (editPassword.trim().length >= 6) {
      payload.password = editPassword.trim();
    }

    startTransition(async () => {
      const res = await updateUserAction(activeUser.id, payload);

      if (res.success && res.data) {
        setUsersList((prev) => prev.map((u) => (u.id === activeUser.id ? res.data! : u)));
        setIsEditOpen(false);
        showFeedback("success", `ব্যবহারকারী "${res.data.email}" সফলভাবে আপডেট হয়েছে!`);
        setActiveUser(null);
      } else {
        showFeedback("error", res.error || "ব্যবহারকারী আপডেট করতে ব্যর্থ হয়েছে");
      }
    });
  };

  // Submit Delete
  const handleDeleteSubmit = () => {
    if (!activeUser) return;

    startTransition(async () => {
      const res = await deleteUserAction(activeUser.id);

      if (res.success) {
        setUsersList((prev) => prev.filter((u) => u.id !== activeUser.id));
        setIsDeleteOpen(false);
        showFeedback("success", `ব্যবহারকারী "${activeUser.email}" মুছে ফেলা হয়েছে!`);
        setActiveUser(null);
      } else {
        showFeedback("error", res.error || "ব্যবহারকারী মুছতে ব্যর্থ হয়েছে");
      }
    });
  };

  return (
    <div id="users" className="scroll-mt-20 space-y-6">
      {/* Toast Feedback */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`animate-in fade-in slide-in-from-top-3 fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all ${
            notification.type === "success"
              ? "border border-emerald-500/50 bg-emerald-900/90 text-white backdrop-blur-md"
              : "border border-rose-500/50 bg-rose-900/90 text-white backdrop-blur-md"
          }`}
        >
          {notification.type === "success" ? (
            <RiCheckLine className="size-5 shrink-0 text-emerald-300" />
          ) : (
            <RiErrorWarningLine className="size-5 shrink-0 text-rose-300" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 rounded p-1 hover:bg-white/20"
            aria-label="বিজ্ঞপ্তি বন্ধ করুন"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* Main Users Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                <RiShieldUserLine className="size-5 text-purple-600 dark:text-purple-400" />
                সিস্টেম ব্যবহারকারী ও অ্যাডমিন তালিকা
              </CardTitle>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              >
                মোট {filteredUsers.length} জন
              </Badge>
            </div>
            <CardDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              অ্যাডমিন, স্টাফ ও সাধারণ ব্যবহারকারী অ্যাকাউন্ট ব্যবস্থাপনা এবং নিরাপত্তা নিয়ন্ত্রণ
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isPending}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              aria-label="তালিকা রিফ্রেশ করুন"
            >
              <RiRefreshLine className={`mr-1.5 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              রিফ্রেশ
            </Button>

            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-purple-600 text-white shadow-xs hover:bg-purple-700"
            >
              <RiUserAddLine className="mr-1.5 size-4" />
              নতুন ইউজার যোগ করুন
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {/* Search and Role Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <RiSearchLine className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <RiCloseLine className="size-4" />
                </button>
              )}
            </div>

            {/* Filter by Role */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <RiFilterLine className="size-3.5" />
                <span>ভূমিকা:</span>
              </div>
              <select
                value={selectedRoleFilter}
                onChange={(e) => {
                  setSelectedRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs focus:border-purple-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="all">সকল ভূমিকা ({totalCount})</option>
                <option value="admin">অ্যাডমিন ({adminCount})</option>
                <option value="staff">স্টাফ ({staffCount})</option>
                <option value="user">সাধারণ ইউজার ({generalUserCount})</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 uppercase dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      ব্যবহারকারী
                    </th>
                    <th scope="col" className="px-4 py-3">
                      ইমেইল
                    </th>
                    <th scope="col" className="px-4 py-3 text-center">
                      ভূমিকা / পদবি
                    </th>
                    <th scope="col" className="px-4 py-3">
                      তৈরির তারিখ
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      অ্যাকশন
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <RiShieldUserLine className="mb-2 size-10 text-slate-300 dark:text-slate-700" />
                          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                            কোনো ব্যবহারকারী পাওয়া যায়নি
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            আপনার অনুসন্ধানের ফিল্টার পরিবর্তন করুন অথবা নতুন ব্যবহারকারী তৈরি করুন
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const initial = user.name
                        ? user.name.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase();
                      return (
                        <tr
                          key={user.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          {/* User info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" className="ring-1 ring-purple-600/30">
                                <AvatarFallback className="bg-purple-100 font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  {initial}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {user.name || "নামহীন ব্যবহারকারী"}
                                </p>
                                <span className="text-[11px] text-slate-400">
                                  ID: {user.id.slice(-6)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                              <RiMailLine className="size-3.5 text-slate-400" />
                              <a
                                href={`mailto:${user.email}`}
                                className="hover:text-purple-600 hover:underline dark:hover:text-purple-400"
                              >
                                {user.email}
                              </a>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3 text-center">{getRoleBadge(user.role)}</td>

                          {/* Date */}
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString("bn-BD", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenPreview(user)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                title="বিস্তারিত দেখুন"
                              >
                                <RiEyeLine className="size-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(user)}
                                className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50"
                                title="এডিট করুন"
                              >
                                <RiEditLine className="size-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(user)}
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                title="মুছে ফেলুন"
                              >
                                <RiDeleteBinLine className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Component (20 items per page default) */}
            <div className="bg-slate-50/50 px-4 dark:bg-slate-900/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                itemName="ব্যবহারকারী"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1. Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleAddSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiUserAddLine className="size-5 text-purple-600" />
                নতুন সিস্টেম ব্যবহারকারী যোগ করুন
              </DialogTitle>
              <DialogDescription>
                অ্যাডমিন বা কর্মীদের জন্য নতুন লগইন অ্যাকাউন্ট তৈরি করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="add-name">পূর্ণ নাম (Full Name)</Label>
                <Input
                  id="add-name"
                  placeholder="যেমন: এস আর অ্যাডমিন"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="add-email">
                  ইমেইল ঠিকানা <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="name@srtradelink.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors((errs) => ({ ...errs, email: "" }));
                  }}
                  className={formErrors.email ? "border-rose-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs font-medium text-rose-500">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="add-password">
                  লগইন পাসওয়ার্ড <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="add-password"
                    type="password"
                    placeholder="ন্যূনতম ৬ অক্ষর"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, password: e.target.value }));
                      if (formErrors.password) setFormErrors((errs) => ({ ...errs, password: "" }));
                    }}
                    className={formErrors.password ? "border-rose-500" : ""}
                  />
                </div>
                {formErrors.password && (
                  <p className="text-xs font-medium text-rose-500">{formErrors.password}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="add-role">ব্যবহারকারীর ভূমিকা (Role)</Label>
                <select
                  id="add-role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-purple-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} - {r.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  "ব্যবহারকারী সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <RiEditLine className="size-5 text-purple-600" />
                ব্যবহারকারী তথ্য সম্পাদনা
              </DialogTitle>
              <DialogDescription>
                ব্যবহারকারীর নাম, ইমেইল, পাসওয়ার্ড ও প্রশাসনিক পদবি আপডেট করুন।
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">পূর্ণ নাম</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">
                  ইমেইল <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors((errs) => ({ ...errs, email: "" }));
                  }}
                  className={formErrors.email ? "border-rose-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs font-medium text-rose-500">{formErrors.email}</p>
                )}
              </div>

              {/* New Password (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-password">নতুন পাসওয়ার্ড (ঐচ্ছিক)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="পরিবর্তন না করতে চাইলে ফাঁকা রাখুন"
                  value={editPassword}
                  onChange={(e) => {
                    setEditPassword(e.target.value);
                    if (formErrors.password) setFormErrors((errs) => ({ ...errs, password: "" }));
                  }}
                  className={formErrors.password ? "border-rose-500" : ""}
                />
                {formErrors.password && (
                  <p className="text-xs font-medium text-rose-500">{formErrors.password}</p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  আগের পাসওয়ার্ড বহাল রাখতে এই ঘরটি ফাঁকা রাখুন।
                </p>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-role">ভূমিকা (Role)</Label>
                <select
                  id="edit-role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:border-purple-600 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} - {r.desc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose render={<Button type="button" variant="outline" />}>বাতিল</DialogClose>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isPending ? (
                  <>
                    <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                    আপডেট হচ্ছে...
                  </>
                ) : (
                  "পরিবর্তন সংরক্ষণ করুন"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RiErrorWarningLine className="size-5" />
              ব্যবহারকারী মুছে ফেলার নিশ্চিতকরণ
            </DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে আপনি <strong>{activeUser?.name || activeUser?.email}</strong>{" "}
              অ্যাকাউন্টটি মুছে ফেলতে চান? এটি ফিরিয়ে আনা সম্ভব নয়।
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              বাতিল করুন
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteSubmit}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                  মুছে ফেলা হচ্ছে...
                </>
              ) : (
                "হ্যাঁ, নিশ্চিতভাবে মুছে ফেলুন"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Preview Profile Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiShieldUserLine className="size-5 text-purple-600" />
              ব্যবহারকারীর প্রোফাইল কার্ড
            </DialogTitle>
          </DialogHeader>

          {activeUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <Avatar size="lg" className="ring-2 ring-purple-600/30">
                  <AvatarFallback className="bg-purple-100 text-lg font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {activeUser.name
                      ? activeUser.name.charAt(0).toUpperCase()
                      : activeUser.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeUser.name || "নামহীন ব্যবহারকারী"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activeUser.email}</p>
                  <div className="mt-1.5">{getRoleBadge(activeUser.role)}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-400">অ্যাকাউন্ট আইডি:</span>
                  <span className="font-mono">{activeUser.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
                  <span className="text-slate-400">নিবন্ধনের তারিখ:</span>
                  <span>
                    {activeUser.created_at
                      ? new Date(activeUser.created_at).toLocaleDateString("bn-BD", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">সর্বশেষ আপডেট:</span>
                  <span>
                    {activeUser.updated_at
                      ? new Date(activeUser.updated_at).toLocaleDateString("bn-BD", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="w-full" />}>
              বন্ধ করুন
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
