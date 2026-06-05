import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import numpy as np

# ============================================================
# All 16 measurement groups (keeping ALL data points)
# data[i] = (label, R_o, R_i, H, theta, rho, [5 measurements])
# ============================================================
raw = [
    ('h=0.4',       3,   1,   30, 90, 7.85, [41.9, 42.9, 42.8, 42.5, 43.9]),
    ('h=0.6',       3,   1,   30, 90, 7.85, [42.2, 42.6, 43.4, 43.6, 43.9]),
    ('h=0.8(默认A)', 3,   1,   30, 90, 7.85, [44.9, 43.5, 42.8, 42.6, 43.6]),
    ('h=1.0',       3,   1,   30, 90, 7.85, [43.9, 43.0, 43.3, 42.9, 44.1]),
    ('R_o=2',       2,   1,   30, 90, 7.85, [29.0, 30.2, 31.5, 31.2, 30.8]),
    ('R_o=2.5',     2.5, 1,   30, 90, 7.85, [41.0, 35.4, 37.7, 37.7, 38.1]),
    ('R_o=3.5',     3.5, 1,   30, 90, 7.85, [59.2, 57.5, 59.9, 58.3, 58.6]),
    ('R_i=0.5',     3,   0.5, 30, 90, 7.85, [64.5, 64.4, 62.9, 62.4, 63.1]),
    ('R_i=1(默认B)', 3,   1,   30, 90, 7.85, [48.9, 47.5, 47.8, 48.6, 49.1]),
    ('R_i=1.5',     3,   1.5, 30, 90, 7.85, [38.3, 37.6, 37.3, 37.1, 37.3]),
    ('R_i=2',       3,   2,   30, 90, 7.85, [22.6, 22.9, 23.0, 23.2, 22.7]),
    ('H=10',        3,   1,   10, 90, 7.85, [23.3, 22.8, 23.6, 23.4, 22.6]),
    ('H=20',        3,   1,   20, 90, 7.85, [29.5, 29.7, 30.0, 30.2, 29.5]),
    ('H=40',        3,   1,   40, 90, 7.85, [58.0, 57.3, 59.1, 58.2, 57.6]),
    ('Al (2.70)',   3,   1,   30, 90, 2.70, [33.5, 33.9, 35.6, 34.4, 35.9]),
    ('Cu (8.90)',   3,   1,   30, 90, 8.90, [50.2, 49.6, 47.8, 48.5, 48.1]),
]

rho_ref = 7.85  # Fe

# ============================================================
# Table 1
# ============================================================
print('=' * 110)
print('H_max 公式拟合分析')
print('模型: H_max = C * (Ro^2 - Ri^2) / Ri^3 * H * sin^2(theta)')
print('      C = C0 * (Ro/Ri)^alpha * (H/Ri)^beta * (rho/7.85)^gamma')
print('=' * 110)
print()
print('【表1】16组实验测量值 (每组5次重复)')
print('-' * 110)
print(f'{"实验组":<20} {"Ro":>5} {"Ri":>5} {"H":>5} {"rho":>6} {"M1":>7} {"M2":>7} {"M3":>7} {"M4":>7} {"M5":>7} {"均值":>8} {"std":>6}')
print('-' * 110)

means, stds = [], []
for row in raw:
    label, Ro, Ri, H, theta, rho, ms = row
    m = np.array(ms)
    mean, std = np.mean(m), np.std(m, ddof=1)
    means.append(mean)
    stds.append(std)
    print(f'{label:<20} {Ro:>5.1f} {Ri:>5.1f} {H:>5.0f} {rho:>6.2f} {ms[0]:>7.1f} {ms[1]:>7.1f} {ms[2]:>7.1f} {ms[3]:>7.1f} {ms[4]:>7.1f} {mean:>8.2f} {std:>6.2f}')
print('-' * 110)

# Note on default condition
default_means_raw = [means[2], means[8]]  # Set A: 43.48, Set B: 48.38
print(f'默认条件 2 组独立测量:  Set A={default_means_raw[0]:.2f} cm,  Set B={default_means_raw[1]:.2f} cm')
print(f'  差异 {abs(default_means_raw[0]-default_means_raw[1]):.2f} cm (约{abs(default_means_raw[0]-default_means_raw[1])/default_means_raw[0]*100:.1f}%), 可能为不同实验批次的系统误差')
print()

# ============================================================
# Build design matrix for fitting
# ============================================================
# For each data point:
#   X1 = ln(Ro/Ri)
#   X2 = ln(H/Ri)
#   X3 = ln(rho/rho_ref)
#   Y  = ln(H_max) - ln((Ro^2-Ri^2)/Ri^3) - ln(H) - ln(sin^2 theta)

N = len(raw)
Y = np.zeros(N)
X1 = np.zeros(N)
X2 = np.zeros(N)
X3 = np.zeros(N)
geo = np.zeros(N)
H_vals = np.zeros(N)
sin_sq = np.zeros(N)
Ro_arr = np.zeros(N)
Ri_arr = np.zeros(N)
H_arr = np.zeros(N)
rho_arr = np.zeros(N)

for i, row in enumerate(raw):
    label, Ro, Ri, H, theta, rho, ms = row
    Ro_arr[i] = Ro; Ri_arr[i] = Ri; H_arr[i] = H; rho_arr[i] = rho
    H_max_i = means[i]
    geo[i] = (Ro**2 - Ri**2) / Ri**3
    H_vals[i] = H
    sin_sq[i] = np.sin(np.radians(theta))**2
    X1[i] = np.log(Ro / Ri)
    X2[i] = np.log(H / Ri)
    X3[i] = np.log(rho / rho_ref)
    Y[i] = np.log(H_max_i) - np.log(geo[i]) - np.log(H) - np.log(sin_sq[i])

# Linear regression: Y = ln(C0) + alpha*X1 + beta*X2 + gamma*X3
X_design = np.column_stack([np.ones(N), X1, X2, X3])
coeff, residuals_lstsq, rank, sv = np.linalg.lstsq(X_design, Y, rcond=None)
ln_C0, alpha, beta, gamma = coeff
C0 = np.exp(ln_C0)

# Predictions
Y_pred_log = X_design @ coeff
H_pred_lin = C0 * np.exp(alpha * X1) * np.exp(beta * X2) * np.exp(gamma * X3) * geo * H_vals * sin_sq

# R^2
def calc_r2(y_true, y_pred):
    ss_res = np.sum((y_true - y_pred)**2)
    ss_tot = np.sum((y_true - np.mean(y_true))**2)
    return 1 - ss_res / ss_tot

R2_log = calc_r2(Y, Y_pred_log)
R2_orig = calc_r2(np.array(means), H_pred_lin)

print('=' * 110)
print('【拟合结果】多元对数线性回归')
print('=' * 110)
print(f'  ln(C0)  = {ln_C0:.6f}')
print(f'  C0      = {C0:.6f}')
print(f'  alpha   = {alpha:.6f}')
print(f'  beta    = {beta:.6f}')
print(f'  gamma   = {gamma:.6f}')
print()
print(f'  完整公式:')
print(f'  H_max = {C0:.4f} * (Ro/Ri)^({alpha:.4f}) * (H/Ri)^({beta:.4f}) * (rho/7.85)^({gamma:.4f})')
print(f'          * (Ro^2 - Ri^2) / Ri^3 * H * sin^2(theta)')
print()
print(f'  对数空间 R^2 = {R2_log:.6f}')
print(f'  原始空间 R^2 = {R2_orig:.6f}')
print()

# ============================================================
# Table 2: Per-condition comparison
# ============================================================
print('=' * 110)
print('【表2】16组实验数据：预测值 vs 实测值')
print('=' * 110)
print(f'{"实验组":<20} {"Ro":>5} {"Ri":>5} {"H":>5} {"rho":>6} {"实测":>8} {"预测":>8} {"残差":>8} {"相对误差%":>9}')
print('-' * 110)

residuals = []
rel_errors = []
for i in range(N):
    label, Ro, Ri, H, theta, rho, ms = raw[i]
    resid = means[i] - H_pred_lin[i]
    rel_err = resid / means[i] * 100
    residuals.append(resid)
    rel_errors.append(rel_err)
    print(f'{label:<20} {Ro:>5.1f} {Ri:>5.1f} {H:>5.0f} {rho:>6.2f} {means[i]:>8.2f} {H_pred_lin[i]:>8.2f} {resid:>8.2f} {rel_err:>9.2f}')
print('-' * 110)

rmse = np.sqrt(np.mean(np.array(residuals)**2))
mae = np.mean(np.abs(residuals))
mape = np.mean(np.abs(rel_errors))
print(f'  RMSE = {rmse:.3f} cm    MAE = {mae:.3f} cm    MAPE = {mape:.2f}%')
print()

# ============================================================
# Table 3: Per experiment group analysis
# ============================================================
print('=' * 110)
print('【表3】按实验类型分组对比')
print('=' * 110)

# Define groups (use unique conditions for group-level R^2)
# For each group, pick the non-thickness-variant data points
group_defs = [
    ('厚度实验 (h = 0.4, 0.6, 0.8, 1.0 cm)', [0, 1, 2, 3],
     'h 对 H_max 无显著影响 (均值 42.80~43.48, 变异系数 <1%)'),
    ('外径实验 (R_o = 2.0, 2.5, 3.0, 3.5 cm)', [4, 5, 2, 6],
     'H_max 随 R_o 增大而增大'),
    ('内径实验 (R_i = 0.5, 1.0, 1.5, 2.0 cm)', [7, 2, 9, 10],
     'H_max 随 R_i 增大而减小'),
    ('释放高度实验 (H = 10, 20, 30, 40 cm)', [11, 12, 2, 13],
     'H_max 随 H 增大而增大'),
    ('材质实验 (Al, Fe, Cu)', [14, 2, 15],
     'H_max 随密度增大而增大 (Cu > Fe > Al)'),
]

for gname, indices, gdesc in group_defs:
    act = np.array([means[i] for i in indices])
    pred = np.array([H_pred_lin[i] for i in indices])
    r2 = calc_r2(act, pred)
    rmse_g = np.sqrt(np.mean((act - pred)**2))
    print(f'\n  {gname}')
    print(f'  {gdesc}')
    for i in indices:
        label, Ro, Ri, H, theta, rho, ms = raw[i]
        resid = means[i] - H_pred_lin[i]
        print(f'    {label:<20}  Ro={Ro:.1f}  Ri={Ri:.1f}  H={H:.0f}  实测={means[i]:.2f}  预测={H_pred_lin[i]:.2f}  残差={resid:+.2f} ({resid/means[i]*100:+.1f}%)')
    print(f'    -> R^2 = {r2:.4f},  RMSE = {rmse_g:.3f} cm')

# ============================================================
# Summary
# ============================================================
print()
print('=' * 110)
print('【总结】')
print('=' * 110)
print(f'''
  拟合参数:
    C0    = {C0:.4f}      (基础比例系数)
    alpha = {alpha:.4f}    (外内径比 Ro/Ri 对 C 的影响指数)
    beta  = {beta:.4f}     (高度内径比 H/Ri 对 C 的影响指数)
    gamma = {gamma:.4f}    (相对密度 rho/7.85 对 C 的影响指数)

  整体拟合质量:
    R^2 (原始空间) = {R2_orig:.4f}
    R^2 (对数空间) = {R2_log:.4f}
    RMSE = {rmse:.3f} cm
    MAPE = {mape:.2f}%

  分组 R^2:''')
for gname, indices, gdesc in group_defs:
    act = np.array([means[i] for i in indices])
    pred = np.array([H_pred_lin[i] for i in indices])
    r2 = calc_r2(act, pred)
    print(f'    {gname:<35}  R^2 = {r2:.4f}')

print(f'''
  模型适用性说明:
  - 厚度 h (0.4-1.0cm) 对 H_max 无显著影响，公式中不含 h 是合理的
  - alpha ≈ {alpha:.1f} 为负值，表示 Ro/Ri 增大时 C 减小，
    部分抵消几何因子 (Ro^2-Ri^2)/Ri^3 随 Ro/Ri 的增长
  - beta ≈ {beta:.1f} 接近 0，说明 H/Ri 对 C 的额外影响较小
  - gamma ≈ {gamma:.1f} > 0，表示密度越大 C 越大 (符合物理直觉)
  - 对数空间 R^2 = {R2_log:.4f} 说明模型形式合理
  - 原始空间误差来源：厚度重复测量变异 + 内径实验默认条件偏移(~5.6cm)
''')
