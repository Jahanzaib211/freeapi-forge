import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Shield, Edit2, Clock, Mail, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const roleColors: Record<string, string> = {
  admin: "bg-purple-600/20 text-purple-400 border-purple-600/50",
  user: "bg-blue-600/20 text-blue-400 border-blue-600/50",
};

export default function InternalUsers() {
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [newRole, setNewRole] = useState("");

  const usersQuery = trpc.organizations.users.list.useQuery();
  const meQuery = trpc.auth.me.useQuery();

  const users = usersQuery.data ?? [];
  const currentUser = meQuery.data;

  const handleSaveRole = (_userId: number) => {
    setEditingRole(null);
  };

  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Internal Users
          </h1>
          <p className="text-slate-400 text-lg">
            Manage team members and roles
          </p>
          {currentUser && (
            <div className="mt-3 flex items-center gap-2">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/50">
                Signed in as {currentUser.name || currentUser.email}
              </Badge>
              <Badge
                className={
                  roleColors[currentUser.role] || roleColors.user
                }
              >
                {currentUser.role}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Users</span>
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">
                {users.length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Admins</span>
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{admins}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Current User</span>
                <Mail className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-lg font-bold text-white truncate">
                {currentUser?.name || currentUser?.email || "Not signed in"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-800/30 border-slate-700/50 backdrop-blur">
          <CardHeader className="border-b border-slate-700/50">
            <CardTitle className="text-white">All Users</CardTitle>
            <CardDescription>
              Manage user roles and assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {usersQuery.isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-300">User</TableHead>
                    <TableHead className="text-slate-300">Role</TableHead>
                    <TableHead className="text-slate-300">
                      Last Signed In
                    </TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow className="border-slate-700/50">
                      <TableCell
                        colSpan={4}
                        className="text-center text-slate-400 py-8"
                      >
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        className="border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">
                              {user.name || "Unknown"}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />{" "}
                              {user.email || "No email"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingRole === user.id ? (
                            <div className="flex gap-2">
                              <Select
                                value={newRole}
                                onValueChange={setNewRole}
                              >
                                <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleSaveRole(user.id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-slate-400"
                                onClick={() => setEditingRole(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              className={
                                roleColors[user.role] || roleColors.user
                              }
                            >
                              {user.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {user.lastSignedIn
                            ? new Date(user.lastSignedIn).toLocaleString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => {
                              setEditingRole(user.id);
                              setNewRole(user.role);
                            }}
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Edit Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
