class Dog
  def initialize(name)
    @name = name
  end

  def bark
    "#{@name} says woof!"
  end
end

dog = Dog.new("Buddy")
puts dog.bark