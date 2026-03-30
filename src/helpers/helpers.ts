export const formatUser = (user: any) => {
    return {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role?.name || user.role,
        isActive: user.isActive
    };
};