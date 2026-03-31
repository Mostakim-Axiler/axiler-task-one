export const formatUser = (user: any) => {
    return {
        id: user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role?.name || user.role,
        isActive: user.isActive
    };
};

export const calculateEndDate = (start: Date, interval: string): Date => {
    const end = new Date(start);

    if (interval === 'month') {
        end.setMonth(end.getMonth() + 1);
    } else if (interval === 'year') {
        end.setFullYear(end.getFullYear() + 1);
    }

    return end;
}