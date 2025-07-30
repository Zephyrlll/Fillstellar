# Godot 球面移動プロトタイプ
# このファイルをGodotプロジェクトで使用する

extends CharacterBody3D

# 惑星パラメータ
@export var planet_center: Vector3 = Vector3.ZERO
@export var planet_radius: float = 100.0

# 移動パラメータ
@export var walk_speed: float = 5.0
@export var run_speed: float = 10.0
@export var jump_force: float = 7.0
@export var gravity_strength: float = 9.81

# 制限
@export var max_latitude: float = 75.0  # 極付近制限

# 内部状態
var is_jumping: bool = false
var current_up: Vector3 = Vector3.UP

# カメラ参照
@onready var camera_pivot = $CameraPivot
@onready var camera = $CameraPivot/Camera3D

func _ready():
	# 初期位置を球面上に配置
	_snap_to_surface()

func _physics_process(delta):
	# 現在の上方向を計算
	current_up = (global_position - planet_center).normalized()
	
	# 重力を適用
	if not is_on_floor():
		velocity -= current_up * gravity_strength * delta
	
	# 入力処理
	_handle_input(delta)
	
	# 移動処理
	move_and_slide()
	
	# 球面に沿わせる
	_snap_to_surface()
	
	# 回転を調整
	_align_to_surface()

func _handle_input(delta):
	# 移動入力
	var input_vector = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	
	if input_vector.length() > 0:
		# カメラの向きを基準に移動方向を計算
		var camera_transform = camera.global_transform
		var forward = -camera_transform.basis.z
		var right = camera_transform.basis.x
		
		# 接平面に投影
		forward = _project_to_tangent_plane(forward)
		right = _project_to_tangent_plane(right)
		
		# 移動ベクトルを計算
		var move_direction = (forward * input_vector.y + right * input_vector.x).normalized()
		
		# 緯度チェック
		if _is_valid_movement(move_direction, delta):
			var speed = run_speed if Input.is_action_pressed("sprint") else walk_speed
			velocity = move_direction * speed
	else:
		# 移動していない時は速度を減衰
		velocity = velocity.lerp(Vector3.ZERO, 10.0 * delta)
	
	# ジャンプ
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity += current_up * jump_force
		is_jumping = true

func _project_to_tangent_plane(vector: Vector3) -> Vector3:
	# ベクトルを接平面に投影
	return (vector - current_up * vector.dot(current_up)).normalized()

func _is_valid_movement(direction: Vector3, delta: float) -> bool:
	# 移動後の位置を予測
	var future_pos = global_position + direction * walk_speed * delta
	var future_normalized = (future_pos - planet_center).normalized()
	
	# 緯度を計算
	var latitude = rad_to_deg(asin(future_normalized.y))
	
	# 制限内かチェック
	return abs(latitude) <= max_latitude

func _snap_to_surface():
	# 常に球面上の正しい高さに配置
	var from_center = global_position - planet_center
	var current_distance = from_center.length()
	
	# 地面からの高さを考慮（キャラクターの半径など）
	var target_distance = planet_radius + 1.0  # 1.0はキャラクターの高さオフセット
	
	if abs(current_distance - target_distance) > 0.01:
		global_position = planet_center + from_center.normalized() * target_distance

func _align_to_surface():
	# キャラクターを重力方向に整列
	var target_transform = transform
	target_transform.basis = _get_aligned_basis(current_up)
	
	# スムーズに補間
	transform.basis = transform.basis.slerp(target_transform.basis, 10.0 * get_physics_process_delta_time())

func _get_aligned_basis(up: Vector3) -> Basis:
	# 現在の前方向を取得
	var forward = -transform.basis.z
	
	# 接平面に投影
	forward = _project_to_tangent_plane(forward)
	
	# 右方向を計算
	var right = forward.cross(up).normalized()
	
	# 前方向を再計算（正確な直交性のため）
	forward = up.cross(right).normalized()
	
	# 基底を構築
	return Basis(right, up, forward)

# デバッグ用
func get_current_latitude_longitude() -> Dictionary:
	var from_center = (global_position - planet_center).normalized()
	var latitude = rad_to_deg(asin(from_center.y))
	var longitude = rad_to_deg(atan2(from_center.x, from_center.z))
	
	return {
		"latitude": latitude,
		"longitude": longitude
	}